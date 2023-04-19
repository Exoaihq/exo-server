import { last } from "lodash";
import { ChatUserType } from "../../../types/chatMessage.type";
import { Database } from "../../../types/supabase";
import { deserializeJson } from "../../../utils/deserializeJson";
import { codeDirectorySearch } from "../codeDirectory/codeDirectory.repository";
import {
  chatAgent,
  createChatCompletion,
  getCompletion,
  getCompletionDefaultStopToken,
} from "../openAi/openai.service";
import { searchCode } from "../search/search.controller";
import { findCodeByQuery } from "../search/search.service";
import {
  parseToJsonPrompt,
  PROMPT_TEMPLATE,
  scratchTemplate,
} from "./agent.prompt";

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
}

interface ToolInfo {
  tool: string;
  toolInput: string;
}

const FINAL_ANSWER_TOKEN = "Final Answer:";
const OBSERVATION_TOKEN = "Observation:";
const THOUGHT_TOKEN = "Thought:";

function getToolDescription(tools: ToolInterface[]): string {
  return tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n");
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

async function decideNextAction(
  prompt: string,
  stopPattern: string[]
): Promise<[string, string, string]> {
  const generated: string = await chatAgent(prompt, stopPattern);
  console.log("generated", generated);
  const json = await parseGeneratedToJson(generated);
  if (json) {
    const { thought, question, reasoning, plan } = json;
    console.log("thought", thought);
    console.log("question", question);
    console.log("reasoning", reasoning);
    console.log("plan", plan);
  }
  const toolInfo: ToolInfo = parse(generated);
  const { tool, toolInput } = toolInfo;
  return [generated, tool, toolInput];
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
  question: string,
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
    .replace("{question}", question)
    .replace("{previous_responses}", "{previous_responses}");

  console.log(prompt.replace("{previous_responses}", ""));

  let runMetadata;
  while (numLoops < maxLoops) {
    numLoops++;

    const currentPrompt = prompt.replace(
      "{previous_responses}",
      previousResponses.join("\n")
    );
    const [generated, tool, tool_input] = await decideNextAction(
      currentPrompt,
      stopPattern
    );
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
  accountId: string
): Promise<string> => {
  const lastMessage = sessionMessages[sessionMessages.length - 1].content;

  const res = await createChatCompletion([
    {
      content: "Please return only the nouns from this message" + lastMessage,
      role: ChatUserType.user,
    },
  ]);

  const nouns = res.choices[0].message.content.split(", ");
  console.log(nouns);

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
          .join(", ")
      : "None";

  const releventCodeToString =
    releventCode && releventCode.length > 0
      ? releventCode
          .map((code) => {
            const { code_explaination, relative_file_path, parsed_code_type } =
              code;
            return `Explaination: ${code_explaination} \n\nPath: ${relative_file_path} \n\nCode type: ${parsed_code_type}`;
          })
          .join(", ")
      : "None";

  const promptToExpandContext = `Please expand the context of this message: ${lastMessage} \n\nRelevent directories: ${releventDirectoriesToString} \n\nRelevent code: ${releventCodeToString}.`;

  const expandedContextRes = await createChatCompletion([
    {
      content: promptToExpandContext,
      role: ChatUserType.user,
    },
  ]);

  return expandedContextRes.choices[0].message.content;
};
