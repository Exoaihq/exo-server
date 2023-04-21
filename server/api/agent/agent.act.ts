import { Database } from "../../../types/supabase";
import { getObjectiveById } from "../objective/objective.service";
import {
  chatAgent,
  getCompletionDefaultStopToken,
} from "../openAi/openai.service";
import { getSessionById } from "../supabase/supabase.service";
import {
  createTaskWithObjective,
  updateTaskById,
} from "../task/task.repository";
import {
  FINAL_ANSWER_TOKEN,
  getToolByNames,
  getToolDescription,
  getToolNames,
  OBSERVATION_TOKEN,
  THOUGHT_TOKEN,
  ToolInfo,
  ToolInterface,
} from "./agent.service";
import { allTools } from "./tools";

export const addPlansTaskListToDb = async (
  objective: Database["public"]["Tables"]["objective"]["Row"],
  plan: string[],
  tools: ToolInterface[],
  userId: string,
  sessionId: string,
  thought: string,
  question: string
) => {
  let planOutput: string[] = [];

  for (let task of plan) {
    const tool = tools.find((tool) => task.includes(tool.name));
    if (tool) {
      // Execute the tool.

      if (tool.arguments && tool.arguments.length === 0) {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
          },
          objective.id
        );
        // const { output, metadata } = await tool.use(userId, sessionId, task);
        // console.log("Tool output", output);
        // planOutput.push(output);
        continue;
      }

      const getToolInputPrompt = `
      You need to get the argument for this tool: 
       Name: ${tool.name}. Description: ${tool.description}.

       Arguments are ${
         tool.arguments && tool.arguments.length > 0
           ? tool.arguments?.map((arg) => `<${arg}>`).join(", ")
           : "none"
       }.

       Return just the argument that will be passed into this tool based on the context above and this string: 
       
       ${task}

       Context: 
       Thought: ${thought}
        Question: ${question}

        <tool argument> = 

      `;

      const res = await getCompletionDefaultStopToken(getToolInputPrompt);

      const toolInput = res.data.choices[0].text;

      if (!toolInput) {
        console.log("No tool input");
        continue;
      } else {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
            tool_input: toolInput,
          },
          objective.id
        );
        // const { output, metadata } = await tool.use(userId, sessionId, toolInput);
        // console.log("Tool output", output);
        // planOutput.push(output);
        continue;
      }
    }
  }
  return planOutput;
};

export const executeTask = async (
  task: Database["public"]["Tables"]["task"]["Row"]
) => {
  const { objective_id, tool_input, tool_name, description } = task;

  if (!objective_id || !tool_input || !tool_name || !description) {
    console.log("Missing some data. Moving on");
    return;
  }

  const objective = await getObjectiveById(objective_id);

  if (!objective) {
    console.log("No objective found");
    return;
  }

  let previouslyCompletedTasksContext = "";

  if (objective.task && objective.task.length > 0 && task.created_at) {
    const previousTasks = objective.task.filter(
      (siblingTask: {
        tool_output: string;
        completed_at: any;
        created_at: string;
      }) => {
        if (!task.created_at) {
          return false;
        }

        // Created before this task and completed.
        return (
          siblingTask.tool_output &&
          siblingTask.completed_at &&
          new Date(siblingTask.created_at) < new Date(task.created_at)
        );
      }
    );

    if (previousTasks.length > 0) {
      previouslyCompletedTasksContext = previousTasks
        .map((task: { description: any; tool_name: any; tool_output: any }) => {
          return `You previously ${task.description} with the tool ${task.tool_name} and the output was ${task.tool_output}}`;
        })
        .join("\n");
    }
  }

  const { session_id } = objective;

  if (!session_id) {
    console.log("No session id found");
    return;
  }

  const session = await getSessionById(session_id);

  if (!session || !session.user_id) {
    console.log("No session found");
    return;
  }

  const tools = getToolByNames(allTools);

  // This runs the tool once and gets the output that will passed to the task loop for further processing.
  const { output, metadata } = await tools[tool_name].use(
    session.user_id,
    session_id,
    tool_input
  );

  if (output) {
    const taskOutput = await runTaskLoop(
      session.user_id,
      session.id,
      description,
      20,
      tools[tool_name].promptTemplate || "",
      output,
      previouslyCompletedTasksContext || ""
    );

    if (taskOutput) {
      await updateTaskById(task.id, {
        tool_output: taskOutput,
        completed_at: new Date().toISOString(),
      });
    } else {
      // Tasks that don't have a tool output are considered completed but the output is not saved.
      await updateTaskById(task.id, {
        completed_at: new Date().toISOString(),
      });
    }
  }
};

function parse(generated: string): ToolInfo {
  if (generated.includes(FINAL_ANSWER_TOKEN)) {
    const finalAnswer: string = generated.split(FINAL_ANSWER_TOKEN)[1].trim();
    return { tool: "Final Answer", toolInput: finalAnswer };
  }

  let tool: string = "";
  let toolInput: string = "";

  const toolRegex: RegExp = /Tool: [\[]?(.*?)[\]]?[\n]*Tool Input:[\s]*(.*)/s;
  const toolMatch: RegExpExecArray | null = toolRegex.exec(generated);
  if (!toolMatch) {
    console.log(`Output of LLM is not parsable for next tool use`);
  } else {
    tool = toolMatch[1].trim();
    toolInput = toolMatch[2].trim().replace(/"/g, "");
  }

  return { tool, toolInput };
}

async function decideNextAction(generated: string): Promise<[string, string]> {
  const toolInfo: ToolInfo = parse(generated);
  const { tool, toolInput } = toolInfo;
  return [tool, toolInput];
}

export async function runTaskLoop(
  userId: string,
  sessionId: string,
  inputQuestion: string,
  maxLoops: number,
  promptTemplate: string,
  initialReponse: string,
  context: string
): Promise<string | undefined> {
  const previousResponses: string[] = [initialReponse];
  let numLoops = 0;
  const tools = allTools;
  const toolDescription = getToolDescription(tools);
  const toolNames = getToolNames(tools);
  const toolByNames = getToolByNames(tools);

  const prompt = promptTemplate
    .replace("{today}", new Date().toISOString().slice(0, 10))
    .replace("{tool_description}", toolDescription)
    .replace("{tool_names}", toolNames)
    .replace("{question}", inputQuestion)
    .replace("{previous_responses}", "{previous_responses}")
    .replace("{context}", context)
    .replace("{response}", initialReponse);

  let runMetadata;
  while (numLoops < maxLoops) {
    numLoops++;

    const currentPrompt = prompt.replace(
      "{previous_responses}",
      previousResponses.join("\n")
    );

    console.log("currentPrompt>>>>>>>>>>>>", currentPrompt);
    // ***** This is the start of the chat agent *****
    const generated: string = await chatAgent(currentPrompt);

    const [tool, tool_input] = await decideNextAction(generated);
    console.log("generated: ", generated);
    console.log(`Tool: ${tool}`);
    console.log(`Tool Input: ${tool_input}`);

    if (tool === "Final Answer") {
      return tool_input;
    }
    if (!toolByNames[tool]) {
      const error = `Unknown tool: ${tool}. Try one of the following: ${toolNames}`;
      console.log(error);
      previousResponses.push(
        `${generated}\n${OBSERVATION_TOKEN} ${error}\n${THOUGHT_TOKEN}`
      );
    } else {
      const { output, metadata } = await toolByNames[tool.toLowerCase()].use(
        userId,
        sessionId,
        tool_input
      );
      if (metadata) {
        runMetadata = metadata;
      }
      const response = `${generated}\n${OBSERVATION_TOKEN} ${output}\n${THOUGHT_TOKEN}`;
      console.log(response);
      previousResponses.push(response);
    }
  }
}
