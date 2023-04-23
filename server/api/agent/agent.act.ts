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
import { getTaskInputTask, getToolInputPrompt } from "./agent.prompt";
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
import {
  allTools,
  searchCodeTool,
  searchDirectoryTool,
  setLocationToWriteCodeTool,
} from "./tools";

export const addPlansTaskListToDb = async (
  objective: Database["public"]["Tables"]["objective"]["Row"],
  plan: string[],
  tools: ToolInterface[],
  thought: string,
  question: string
) => {
  let planOutput: string[] = [];

  for (let task of plan) {
    // const taskInputTask = await getCompletionDefaultStopToken(
    //   getTaskInputTask(plan, thought)
    // );

    const tool = tools.find((tool) => task.includes(tool.name));
    if (tool) {
      // Create the task even if the tool doesn't have arguments
      if (tool.arguments && tool.arguments.length === 0) {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
          },
          objective.id
        );

        continue;
      }

      const toolInputResponse = await getCompletionDefaultStopToken(
        getToolInputPrompt(tool, task, thought, question)
      );

      const toolInput = toolInputResponse.data.choices[0].text;
      console.log("Tool input", toolInput);

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

  updateTaskById(task.id, {
    started_eval_at: new Date().toISOString(),
  });

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
      // All previous task must be completed before this task can be executed.
      const allPreviousTasksCompleted = previousTasks.every(
        (task: { completed_at: any }) => task.completed_at
      );

      if (!allPreviousTasksCompleted) {
        console.log(task.tool_name, "Previous tasks not completed");
        return "Previous tasks not completed";
      }

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
  const allToolsAvailable = getToolByNames(allTools);

  // This runs the tool once and gets the output that will passed to the task loop for further processing.
  const { output, metadata } = await allToolsAvailable[tool_name].use(
    session.user_id,
    session_id,
    tool_input
  );

  const toolToUse = allToolsAvailable[tool_name];

  // if (output) {
  const taskOutput = await runTaskLoop(
    session.user_id,
    session.id,
    description,
    5,
    toolToUse,
    previouslyCompletedTasksContext || "",
    output || "",
    tool_name === "search directory" ? "Observation:" : null
  );

  if (taskOutput) {
    // function to update other tasks in the objective with the output of this task

    await updateTaskById(task.id, {
      tool_output: taskOutput,
      completed_at: new Date().toISOString(),
    });

    // Each task should have an output function that is called when the task is completed and should do things like update the sessions and the ai generated code.
    toolToUse.outputFunction &&
      toolToUse.outputFunction(taskOutput, session_id);
  } else {
    // Tasks that don't have a tool output are considered completed but the output is not saved. These tasks are incomplete
    await updateTaskById(task.id, {
      completed_at: new Date().toISOString(),
    });
  }
  // }
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
  tool: ToolInterface,
  context: string,
  output: string = "",
  stopToken: string | null = null
): Promise<string | undefined> {
  const { promptTemplate } = tool;

  const previousResponses: string[] = [output];
  let numLoops = 0;
  const tools = tool.availableTools.map((toolName) => {
    return allTools.find((tool) => tool.name === toolName);
  }) as ToolInterface[];
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
    .replace("{response}", output);

  let runMetadata;
  while (numLoops < maxLoops) {
    numLoops++;

    const currentPrompt = prompt.replace(
      "{previous_responses}",
      previousResponses.join("\n")
    );

    console.log("currentPrompt>>>>>>>>>>>>", currentPrompt);
    // ***** This is the start of the chat agent *****
    const generated: string = await chatAgent(currentPrompt, stopToken);

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
