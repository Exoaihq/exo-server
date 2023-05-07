import { ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../types/supabase";
import {
  logError,
  logInfo,
  logWarning,
} from "../../../utils/commandLineColors";
import { extractUniqueNumbers } from "../../../utils/getUniqueNumbers";
import { getObjectiveById } from "../objective/objective.repository";
import {
  baseCreateChat,
  getCompletionDefaultStopToken,
} from "../openAi/openAi.repository";
import {
  createChatCompletion,
  createChatWithUserRoleAndLowTemp,
} from "../openAi/openai.service";

import { getSessionById } from "../supabase/supabase.service";
import {
  createTaskWithObjective,
  updateTaskById,
} from "../task/task.repository";
import { isGenerateCodeTool, isSearchTool } from "./agent.context";
import { getToolInputPrompt } from "./agent.prompt";
import {
  FINAL_ANSWER_TOKEN,
  OBSERVATION_TOKEN,
  THOUGHT_TOKEN,
  ToolInfo,
  ToolInterface,
  getToolByNames,
  getToolDescription,
  getToolNames,
} from "./agent.service";
import { allTools } from "./tools";

export const addPlansTaskListToDb = async (
  objective: Database["public"]["Tables"]["objective"]["Row"],
  plan: string[],
  tools: ToolInterface[],
  thought: string,
  question: string
) => {
  let planOutput: string[] = [];

  const plansWithLoopRequirements = await createChatCompletion(
    [
      {
        content: `Which of these tasks will have a list of outputs vs one output? ${plan.map(
          (item, index) => {
            return `${index + 1}. ${item}`;
          }
        )}. Return just the number of the task.`,
        role: ChatUserType.user,
      },
    ],
    EngineName.Turbo,
    0.2
  );

  const plansThatRequireLoop = extractUniqueNumbers(plansWithLoopRequirements);

  for (let i = 0; i < plan.length; i++) {
    const task = plan[i];
    logInfo(`Task: ${task}`);

    const tool = tools.find((tool) => task.includes(tool.name));
    if (tool) {
      // Create the task even if the tool doesn't have arguments
      if (tool && tool.arguments && tool.arguments.length === 0) {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
            marked_ready: i === 0 || isSearchTool(tool.name) ? true : false,
            requires_loop: plansThatRequireLoop.includes(i + 1),
            index: i + 1,
          },
          objective.id
        );

        continue;
      }

      const toolInputResponse = await getCompletionDefaultStopToken(
        getToolInputPrompt(tool, task, thought, question)
      );

      console.log("Tool input", toolInputResponse);

      if (!toolInputResponse) {
        console.log("No tool input");
        continue;
      } else {
        await createTaskWithObjective(
          {
            description: task,
            tool_name: tool.name,
            tool_input: toolInputResponse,
            marked_ready: i === 0 ? true : false,
            requires_loop: plansThatRequireLoop.includes(i + 1),
            index: i + 1,
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
  const { objective_id, tool_input, tool_name, description, index } = task;

  updateTaskById(task.id, {
    started_eval_at: new Date().toISOString(),
  });

  if (!objective_id || !tool_input || !tool_name || !index) {
    logWarning("Missing some data. Moving on");
    return;
  }

  const objective = await getObjectiveById(objective_id);

  if (!objective) {
    logError("No objective found");
    return;
  }

  const allTasksForObjective = objective.task;

  logInfo(`Previously completed tasks: ${allTasksForObjective}`);
  const { session_id } = objective;

  if (!session_id) {
    logError("No session id found");
    return;
  }

  const session = await getSessionById(session_id);

  if (!session || !session.user_id) {
    logError("No session found");
    return;
  }
  const allToolsAvailable = getToolByNames(allTools);

  logInfo(`Tool ${tool_name} input: ${tool_input}`);

  // This runs the tool once and gets the output that will passed to the task loop for further processing.
  const { output } = await allToolsAvailable[tool_name].use(
    session.user_id,
    session_id,
    tool_input
  );

  logInfo(`Tool ${tool_name} output: ${output}`);

  const toolToUse = allToolsAvailable[tool_name];

  if (output) {
    const taskOutput = await runTaskLoop(
      session.user_id,
      session.id,
      description || "",
      5,
      toolToUse,
      output || "",
      "\nObservation:"
    );

    if (output || taskOutput) {
      // function to update other tasks in the objective with the output of this task

      await updateTaskById(task.id, {
        tool_output: taskOutput ? taskOutput : output,
        completed_at: new Date().toISOString(),
      });

      // If there is another task, add the output to the next task's input

      const nextTask = allTasksForObjective.find(
        (sibling) => sibling.index === index + 1
      );
      logInfo(`Next task to update: ${nextTask}`);

      if (nextTask) {
        await updateTaskById(nextTask.id, {
          tool_input: taskOutput ? taskOutput : output,
          // Only the user can mark the task as ready if it is a generate code task
          marked_ready: isGenerateCodeTool(nextTask) ? false : true,
        });
      }

      // Each task should have an output function that is called when the task is completed and should do things like update the sessions and the ai generated code.
      // toolToUse.outputFunction && toolToUse.outputFunction(output, session_id);
    } else {
      // Tasks that don't have a tool output are considered completed but the output is not saved. These tasks are incomplete
      // await updateTaskById(task.id, {
      //   completed_at: new Date().toISOString(),
      // });
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
  return [tool.toLowerCase(), toolInput];
}

export async function runTaskLoop(
  userId: string,
  sessionId: string,
  inputQuestion: string,
  maxLoops: number,
  tool: ToolInterface,
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
    .replace("{response}", output);

  let runMetadata;
  let stop = false;
  while (numLoops < maxLoops && !stop) {
    numLoops++;

    const currentPrompt = prompt.replace(
      "{previous_responses}",
      previousResponses.join("\n")
    );

    // console.log("currentPrompt>>>>>>>>>>>>", currentPrompt);
    // ***** This is the start of the chat agent *****
    const generated: string = await createChatWithUserRoleAndLowTemp(
      currentPrompt,
      stopToken
    );

    const [tool, tool_input] = await decideNextAction(generated);
    console.log("generated: ", generated);
    console.log(`Tool: ${tool}`);
    console.log(`Tool Input: ${tool_input}`);

    if (tool === "final answer") {
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
        if (metadata.stop) {
          stop = true;
        }
      }
      const response = `${generated}\n${OBSERVATION_TOKEN} ${output}\n${THOUGHT_TOKEN}`;
      previousResponses.push(response);
    }
  }
}
