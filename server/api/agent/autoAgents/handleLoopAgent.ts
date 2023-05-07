import { ChatUserType } from "../../../../types/chatMessage.type";
import { logError, logInfo } from "../../../../utils/commandLineColors";
import { deserializeJson } from "../../../../utils/deserializeJson";
import { OpenAiChatCompletionResponse } from "../../codeCompletion/codeCompletion.types";
import { createChatCompletion } from "../../openAi/openai.service";
import { createTaskWithObjective } from "../../task/task.repository";
import { Task, TaskWithObjective } from "../../task/task.types";
import { getToolByNames } from "../agent.service";
import { allTools } from "../tools";

const loopPrompt = (
  task: TaskWithObjective,
  generativeTask: Task,
  toolArgument: string
) => `
Here is your objective: ${generativeTask.description}

Here is what you know so far: ${task.tool_output}

Here are the tools you can use to complete tasks: 

toolName: ${generativeTask.tool_name}
toolInput: ${toolArgument}

You can complete this loop n number of times. 

Here is the json format of the output:
[
    {
    "toolName": ${generativeTask.tool_name},
    "toolInput": ${toolArgument} 
    }
]

Create all the tasks you need to complete this objective using the above json format.

`;

async function runLoop(prompt: string) {
  let input: { toolName: string; toolInput: string }[] | null = null;
  try {
    logInfo(`Loop prompt: ${prompt}`);
    const response: string = await createChatCompletion([
      {
        content: prompt,
        role: ChatUserType.user,
      },
    ]);

    logInfo(`Loop response: ${response}`);
    input = JSON.parse(response);
    if (!input) {
      input = extractAllToolInfo(response);
    }
    if (!input) {
      logError(`Loop agent failed to run. Aborting...`);
      throw new Error("Loop agent failed to run. Aborting...");
    }
    logInfo(`Input: ${JSON.stringify(input)}`);
    return input;
  } catch (e) {
    return null;
  }
}

export async function handleLoopAgent(
  task: TaskWithObjective,
  generativeTask: Task
) {
  let input: { toolName: string; toolInput: string }[] | null = null;

  const tools = getToolByNames(allTools);
  const toolArgument = tools[generativeTask.tool_name || ""].arguments[0];
  const prompt = loopPrompt(task, generativeTask, toolArgument);

  let runCount = 0;
  input = await runLoop(prompt);

  if (!input && runCount < 5) {
    runCount++;
    input = await runLoop(prompt);
  } else if (runCount >= 5) {
    logError(`Loop agent failed to run 5 times. Aborting...`);
    return null;
  }
  if (!input || input.length === 0) return;

  for (let tool of input) {
    const res = await createTaskWithObjective(
      {
        tool_name: tool.toolName,
        tool_input: tool.toolInput,
      },
      task.objective_id || ""
    );
    logInfo(`Created task: ${JSON.stringify(res)}`);
  }

  return input;
}

function extractAllToolInfo(
  rawText: string
): { toolName: string; toolInput: string }[] {
  const regex = /toolName:\s*"([^"]+)"[\s\S]*?toolInput:\s*"([^"]+)"/g;
  const matches = [];
  let match;

  while ((match = regex.exec(rawText)) !== null) {
    matches.push({
      toolName: match[1],
      toolInput: match[2],
    });
  }

  return matches;
}
