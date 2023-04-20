import { ChatUserType } from "../../../types/chatMessage.type";
import { Database } from "../../../types/supabase";
import { deserializeJson } from "../../../utils/deserializeJson";
import { codeDirectorySearch } from "../codeDirectory/codeDirectory.repository";
import { createMessageWithUser } from "../message/message.service";
import { createObjectiveWithSession } from "../objective/objective.service";
import {
  chatAgent,
  createChatCompletion,
  getCompletionDefaultStopToken,
} from "../openAi/openai.service";
import { findCodeByQuery } from "../search/search.service";
import { actOnPlan } from "./agent.act";
import { parseToJsonPrompt, scratchTemplate } from "./agent.prompt";

export interface ToolResponse {
  output: string;
  metadata?: any;
}

export interface RunResponse {
  output: string;
  runMetadata: any;
}

export interface ToolInterface {
  name: string;
  description: string;
  use: (
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    input: string
  ) => Promise<ToolResponse>;
  arguments?: string[];
}

interface ToolInfo {
  tool: string;
  toolInput: string;
}

const FINAL_ANSWER_TOKEN = "Final Answer:";
const OBSERVATION_TOKEN = "Observation:";
const THOUGHT_TOKEN = "Thought:";

export function getToolDescription(tools: ToolInterface[]): string {
  return tools
    .map((tool) => {
      const argList =
        tool.arguments && tool.arguments.length > 0
          ? tool.arguments.map((arg) => `<${arg}>`).join(", ")
          : "";

      return `"${tool.name}": ${tool.description}, args ${argList} `;
    })
    .join("\n");
}

function getToolNames(tools: ToolInterface[]): string {
  return tools.map((tool) => tool.name).join(", ");
}

function getToolByNames(tools: ToolInterface[]): {
  [key: string]: ToolInterface;
} {
  const toolByNames = {} as { [key: string]: ToolInterface };
  tools.forEach((tool) => {
    toolByNames[tool.name] = tool;
  });
  return toolByNames;
}

export const parseGeneratedToJson = async (generated: string) => {
  // NEED to fix this
  const parsedToJson = await getCompletionDefaultStopToken(
    parseToJsonPrompt(generated)
  );

  const response = parsedToJson.data.choices[0].text;
  console.log(">>>>>>>>>Parsed to json", response);

  const json = deserializeJson(response);

  return json;
};

async function decideNextAction(generated: string): Promise<[string, string]> {
  const toolInfo: ToolInfo = parse(generated);
  const { tool, toolInput } = toolInfo;
  return [tool, toolInput];
}

function parse(generated: string): ToolInfo {
  if (generated.includes(FINAL_ANSWER_TOKEN)) {
    const finalAnswer: string = generated.split(FINAL_ANSWER_TOKEN)[1].trim();
    return { tool: "Final Answer", toolInput: finalAnswer };
  }

  let tool: string = "";
  let toolInput: string = "";

  const toolRegex: RegExp =
    /Action: [\[]?(.*?)[\]]?[\n]*Action Input:[\s]*(.*)/s;
  const toolMatch: RegExpExecArray | null = toolRegex.exec(generated);
  if (!toolMatch) {
    console.log(`Output of LLM is not parsable for next tool use`);
  } else {
    tool = toolMatch[1].trim();
    toolInput = toolMatch[2].trim().replace(/"/g, "");
  }

  const planRegex: RegExp = /Plan: [\[]?(.*?)[\]]?[\n]/s;
  const planMatch: RegExpExecArray | null = planRegex.exec(generated);
  console.log("planMatch", planMatch);

  return { tool, toolInput };
}

export async function run(
  user: Database["public"]["Tables"]["users"]["Row"],
  sessionId: string,
  tools: ToolInterface[],
  inputQuestion: string,
  maxLoops: number
): Promise<RunResponse | undefined> {
  const stopPattern: string[] = [
    `\n${OBSERVATION_TOKEN}`,
    `\n\t${OBSERVATION_TOKEN}`,
  ];

  const previousResponses: string[] = [];
  let numLoops = 0;
  const toolDescription = getToolDescription(tools);
  const toolNames = getToolNames(tools);
  const toolByNames = getToolByNames(tools);
  const promptTemplate = scratchTemplate;

  const prompt = promptTemplate
    .replace("{today}", new Date().toISOString().slice(0, 10))
    .replace("{tool_description}", toolDescription)
    .replace("{tool_names}", toolNames)
    .replace("{question}", inputQuestion)
    .replace("{previous_responses}", "{previous_responses}");

  let runMetadata;
  while (numLoops < maxLoops) {
    numLoops++;

    const currentPrompt = prompt.replace(
      "{previous_responses}",
      previousResponses.join("\n")
    );

    // ***** This is the start of the chat agent *****
    const generated: string = await chatAgent(currentPrompt, stopPattern);

    const json = await parseGeneratedToJson(generated);
    if (json) {
      const { thought, question, reasoning, plan, criticism } = json;

      createMessageWithUser(
        user,
        {
          content: `Here is the question I'm trying to answer: ${question}. And my plan is: ${plan
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

      if (objective && plan) {
        // Add the plan list to tasks
        const results = await actOnPlan(
          objective,
          plan,
          tools,
          user,
          sessionId,
          thought,
          question
        );

        console.log("results", results);

        await createMessageWithUser(
          user,
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

    const [tool, tool_input] = await decideNextAction(generated);
    console.log("generated: ", generated);
    console.log(`Tool: ${tool}`);
    console.log(`Tool Input: ${tool_input}`);

    if (tool === "Final Answer") {
      return {
        output: tool_input,
        runMetadata,
      };
    }
    if (!toolByNames[tool]) {
      console.log(`Unknown tool: ${tool}`);
    }
    const { output, metadata } = await toolByNames[tool.toLowerCase()].use(
      user,
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

export const expandContext = async (
  sessionMessages: string | any[],
  accountId: string,
  user: {
    id: string;
  },
  sessionId: string
): Promise<string> => {
  const lastMessage = sessionMessages[sessionMessages.length - 1].content;

  const res = await createChatCompletion([
    {
      content: "Please return only the nouns from this message" + lastMessage,
      role: ChatUserType.user,
    },
  ]);

  const nouns = res.choices[0].message.content.split(", ");

  createMessageWithUser(
    user,
    {
      content: `I'm checking your directories and code for some additional context...`,
      role: ChatUserType.assistant,
    },
    sessionId
  );

  let releventDirectories: any[] = [];
  let releventCode: any[] = [];

  for (let noun of nouns) {
    const directorySearch = await codeDirectorySearch(noun, accountId, 3);

    if (directorySearch && directorySearch.length > 0) {
      directorySearch.forEach((directory) => {
        if (directory.similarity > 0.81) {
          releventDirectories.push(directory);
        }
      });
    }

    const codeSearch = await findCodeByQuery(noun, accountId, 3);
    if (codeSearch && codeSearch.length > 0) {
      codeSearch.forEach((code: any) => {
        if (code.similarity > 0.81) {
          releventCode.push(code);
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
      user,
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
  //     role: ChatUserType.user,
  //   },
  // ]);

  const promptToExpandContext = `Please expand the context of this message: ${lastMessage} \n\nRelevent directories: ${releventDirectoriesToString} \n\nRelevent code: ${releventCodeToString}.`;

  return promptToExpandContext;
};
