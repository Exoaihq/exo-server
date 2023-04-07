import { Database } from "../../../types/supabase";
import { chatAgent } from "../openAi/openai.service";
import { PROMPT_TEMPLATE } from "./agent.prompt";

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

async function decideNextAction(
  prompt: string,
  stopPattern: string[]
): Promise<[string, string, string]> {
  const generated: string = await chatAgent(prompt, stopPattern);
  const toolInfo: ToolInfo = parse(generated);
  const { tool, toolInput } = toolInfo;
  return [generated, tool, toolInput];
}

function parse(generated: string): ToolInfo {
  if (generated.includes(FINAL_ANSWER_TOKEN)) {
    const finalAnswer: string = generated.split(FINAL_ANSWER_TOKEN)[1].trim();
    return { tool: "Final Answer", toolInput: finalAnswer };
  }

  const regex: RegExp = /Action: [\[]?(.*?)[\]]?[\n]*Action Input:[\s]*(.*)/s;
  const match: RegExpExecArray | null = regex.exec(generated);
  if (!match) {
    throw new Error(
      `Output of LLM is not parsable for next tool use: \`${generated}\``
    );
  }

  const tool: string = match[1].trim();
  const toolInput: string = match[2].trim().replace(/"/g, "");
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
  const promptTemplate = PROMPT_TEMPLATE;

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
    if (tool === "Final Answer") {
      return {
        output: tool_input,
        runMetadata,
      };
    }
    if (!toolByNames[tool]) {
      console.log(`Unknown tool: ${tool}`);
    }
    const { output, metadata } = await toolByNames[tool].use(
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
