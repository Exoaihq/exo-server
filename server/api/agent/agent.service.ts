import { ChatUserType } from "../../../types/chatMessage.type";
import { deserializeJson } from "../../../utils/deserializeJson";

import { createMessageWithUser } from "../message/message.service";
import { createObjectiveWithSession } from "../objective/objective.repository";

import {
  chatAgent,
  createChatCompletion,
  getCompletionDefaultStopToken,
} from "../openAi/openai.service";
import { codeDirectorySearch } from "../search/search.repository";
import { findCodeByQuery } from "../search/search.service";
import { TaskWithObjective } from "../task/task.types";
import { addPlansTaskListToDb } from "./agent.act";
import { parseToJsonPrompt, promptTemplate } from "./agent.prompt";
import { ToolName } from "./tools";

export interface ToolResponse {
  output: string;
  metadata?: any;
}

export interface RunResponse {
  output: string;
  runMetadata: any;
}

export interface ToolInterface {
  name: ToolName;
  description: string;
  use: (
    userId: string,
    sessionId: string,
    input: string,
    task?: Partial<TaskWithObjective>
  ) => Promise<ToolResponse>;
  arguments: string[];
  promptTemplate: string;
  availableTools: ToolName[];
  outputFunction?: (output: string, sessionId: string) => void;
}

export interface ToolInfo {
  tool: string;
  toolInput: string;
}

export const FINAL_ANSWER_TOKEN = "Final Answer:";
export const OBSERVATION_TOKEN = "Observation:";
export const THOUGHT_TOKEN = "Thought:";

export function getToolDescription(tools: ToolInterface[]): string {
  return tools
    .map((tool) => {
      const argList =
        tool && tool.arguments && tool.arguments.length > 0
          ? tool.arguments.map((arg) => `<${arg}>`).join(", ")
          : "";

      return `"${tool && tool.name}": ${
        tool && tool.description
      }, Tool Input ${argList} (this is a required argument passed into this tool) `;
    })
    .join("\n");
}

export function getToolNames(tools: ToolInterface[]): string {
  return tools.map((tool) => tool && tool.name).join(", ");
}

export function getToolByNames(tools: ToolInterface[]): {
  [key: string]: ToolInterface;
} {
  const toolByNames = {} as { [key: string]: ToolInterface };
  tools.forEach((tool) => {
    if (!tool) return;
    toolByNames[tool.name] = tool;
  });
  return toolByNames;
}

export const parseGeneratedToJson = async (generated: string) => {
  // NEED to fix this
  const parsedToJson = await getCompletionDefaultStopToken(
    parseToJsonPrompt(generated)
  );

  const response = parsedToJson?.data?.choices[0]?.text;
  console.log(">>>>>>>>>Parsed to json", response);

  const json = deserializeJson(response);

  return json;
};

export async function startNewObjective(
  userId: string,
  sessionId: string,
  tools: ToolInterface[],
  inputQuestion: string
): Promise<RunResponse | undefined> {
  const previousResponses: string[] = [];

  const toolDescription = getToolDescription(tools);
  const toolNames = getToolNames(tools);

  const prompt = promptTemplate
    .replace("{today}", new Date().toISOString().slice(0, 10))
    .replace("{tool_description}", toolDescription)
    .replace("{tool_names}", toolNames)
    .replace("{question}", inputQuestion)
    .replace("{previous_responses}", "{previous_responses}");

  console.log(prompt.replace("{previous_responses}", ""));

  const currentPrompt = prompt.replace(
    "{previous_responses}",
    previousResponses.join("\n")
  );

  // ***** This is the start of the chat agent *****
  const generated: string = await chatAgent(currentPrompt);

  console.log("generated????????", generated);
  const json = await parseGeneratedToJson(generated);
  if (json) {
    const { thought, question, reasoning, plan, criticism } = json;

    createMessageWithUser(
      {
        content: `Here is the question I'm trying to answer: ${question} And my plan is: ${plan
          .map((item: string, index: any) => `${item}`)
          .join("\n")}`,
        role: ChatUserType.assistant,
      },
      sessionId
    );
    console.log("thought", thought);
    console.log("question", question);
    console.log("reasoning", reasoning);
    console.log("plan", plan);
    const objective = await createObjectiveWithSession(
      {
        thought,
        question: question ? question : inputQuestion,
        reasoning,
        criticism,
      },
      sessionId
    );

    if (plan) {
      // Add the plan list to tasks
      const results = await addPlansTaskListToDb(
        objective,
        plan,
        tools,
        thought,
        question
      );

      console.log("results", results);

      await createMessageWithUser(
        {
          content:
            "Let me know if you want me to execute this plan as described above. If not, you can change the plan or expand on the goal. If you want to change the goal, you can ask me to start over.",
          role: ChatUserType.assistant,
        },
        sessionId
      );
    }

    return;
  } else {
    // Send message to user that we couldn't parse the response to json
    throw new Error("Could not parse response to json");
  }
}

export const expandContext = async (
  sessionMessages: string | any[],
  accountId: string,
  userId: string,
  sessionId: string
): Promise<string> => {
  const lastMessage = sessionMessages[sessionMessages.length - 1].content;

  let releventDirectories: any[] = [];
  let releventCode: any[] = [];

  const codeSearch = await findCodeByQuery(lastMessage, accountId, 3);
  if (codeSearch && codeSearch.length > 0) {
    codeSearch.forEach((code: any) => {
      if (code.similarity > 0.81) {
        releventCode.push(code);
      }
    });
  }

  const res = await createChatCompletion([
    {
      content: "Please return only the nouns from this message" + lastMessage,
      role: ChatUserType.user,
    },
  ]);

  const nouns = res?.choices[0]?.message.content.split(", ");

  createMessageWithUser(
    {
      content: `I'm checking your directories and code for some additional context...`,
      role: ChatUserType.assistant,
    },
    sessionId
  );

  for (let noun of nouns) {
    const directorySearch = await codeDirectorySearch(noun, accountId, 3);

    if (directorySearch && directorySearch.length > 0) {
      directorySearch.forEach((directory) => {
        if (directory.similarity > 0.81) {
          releventDirectories.push(directory);
        }
      });
    }
  }

  const releventDirectoriesToString =
    releventDirectories && releventDirectories.length > 0
      ? releventDirectories
          .map((directory) => {
            const { directory_name, file_path, directory_explaination } =
              directory;
            return `Directory: ${directory_name} \n\nPath: ${file_path} \n\nExplaination: ${directory_explaination}`;
          })
          .join(" ")
      : "None";

  const releventCodeToString =
    releventCode && releventCode.length > 0
      ? releventCode
          .map((code) => {
            const { code_explaination, relative_file_path, parsed_code_type } =
              code;
            return `Explaination: ${code_explaination} \n\nPath: ${relative_file_path} \n\nCode type: ${parsed_code_type}`;
          })
          .join(" ")
      : "None";

  if (
    releventDirectoriesToString !== "None" ||
    releventCodeToString !== "None"
  ) {
    createMessageWithUser(
      {
        content: `I've found some additional context. \n\nRelevent directories: ${releventDirectories.length} \n\nRelevent code: ${releventCode.length}`,
        role: ChatUserType.assistant,
      },
      sessionId
    );
  }

  // const promptToExpandContext = `Please expand the context of this message: ${lastMessage} \n\nRelevent directories: ${releventDirectoriesToString} \n\nRelevent code: ${releventCodeToString}.`;

  // const expandedContextRes = await createChatCompletion([
  //   {
  //     content: promptToExpandContext,
  //     role: ChatUserType.user
  //   },
  // ]);

  const promptToExpandContext = `Please expand the context of this message: ${lastMessage} \n\nRelevent directories: ${releventDirectoriesToString} \n\nRelevent code: ${releventCodeToString}.`;

  return promptToExpandContext;
};
