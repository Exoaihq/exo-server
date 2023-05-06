import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { CompletionResponse } from "../../../types/openAiTypes/openAiCompletionReqRes";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import {
  clearLoading,
  commandLineLoading,
} from "../../../utils/commandLineLoadingl";
import { openAiApiKey } from "../../../utils/envVariable";

import { RateLimiter } from "limiter";
import { OpenAiChatCompletionResponse } from "../codeCompletion/codeCompletion.types";
import { logError } from "../../../utils/commandLineColors";
const { Configuration, OpenAIApi } = require("openai");
const { encode, decode } = require("gpt-3-encoder");

export function truncateStringTokens(str: string, maxTokens = 2046) {
  let encoded = encode(str || "");
  return decode(encoded.slice(0, maxTokens));
}

// Allow 30 requests per min (the Open api limit for embeddings). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
const limiter = new RateLimiter({ tokensPerInterval: 15, interval: "minute" });

const raisingHands = String.fromCodePoint(0x1f64c);

const configuration = new Configuration({
  apiKey: openAiApiKey,
});

const openai = new OpenAIApi(configuration);

export async function chatAgent(
  prompt: string,
  stopToken: string | null = null
) {
  const interval = commandLineLoading("Create chat agent");
  const res = await openai.createChatCompletion({
    messages: [
      {
        content: prompt,
        role: ChatUserType.user,
      },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    model: "gpt-3.5-turbo",
    stop: stopToken ? [stopToken] : null,
  });
  clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
  if (res.data.error) {
    console.log(">>>>>>>>>>>>>>error", res.data.error);
  }

  return res.data.choices[0].message.content;
}

export async function chatAgentWithStopToken(
  prompt: string,
  stopToken: string
) {
  const interval = commandLineLoading("Create chat agent with stop token");

  const res = await openai.createChatCompletion({
    messages: [
      {
        content: prompt,
        role: ChatUserType.user,
      },
    ],
    max_tokens: 2048,
    temperature: 0.2,
    model: "gpt-3.5-turbo",
    stop: [stopToken],
  });

  if (res.data.error) {
    console.log(">>>>>>>>>>>>>>error", res.data.error);
  }
  clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
  return res.data.choices[0].message.content;
}

export async function getOpenAiModels() {
  try {
    return await openai.listEngines();
  } catch (error: any) {
    console.log(error);
    throw error;
  }
}

export async function getChatCompletion(
  messages: ChatMessage[],
  model: EngineName = EngineName.Turbo,
  temperature: number = 1,
  maxTokens: number = 2048
) {
  try {
    const res = await openai.createChatCompletion({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
    if (res.status === 429) {
      console.log("Too many requests");
      setTimeout(() => {
        getChatCompletion(messages, model, temperature, maxTokens);
      }, 2000);
    }
    return res;
  } catch (error: any) {
    console.log(">>>>>>>>>>>>>>error", error.reponse);
    return error;
  }
}

export async function getCompletion(
  prompt: string,
  temperature: number = 1,
  stop: string[] | null = null
) {
  // const availableEngines = await getOpenAiModelsFromDb();

  // const gpt4 = availableEngines?.find((engine: any) => {
  //   return engine.id === "gpt-4";
  // });

  try {
    return await openai.createCompletion({
      model: "text-davinci-003",
      prompt: truncateStringTokens(prompt, 2048),
      max_tokens: 2048,
      temperature,
      stop,
    });
  } catch (error: any) {
    console.log(error);
    throw error;
  }
}

export async function getCompletionDefaultStopToken(
  prompt: string,
  temperature: number = 0
) {
  try {
    return await openai.createCompletion({
      model: "text-davinci-002",
      prompt,
      max_tokens: 2048,
      temperature,
    });
  } catch (error: any) {
    console.log(error);
    throw error;
  }
}

export async function getSummaryOfCode(codeContent: string) {
  const interval = commandLineLoading("Summarizing code");

  const res = await createChatCompletion(
    [
      {
        content:
          "What does this code do:" +
          codeContent +
          "Please include the coding language",
        role: ChatUserType.user,
      },
    ],
    EngineName.Turbo,
    0.2
  );
  const explaination = res.choices[0].message.content;
  clearLoading(interval, `Summarizing code query completed`);

  if (!explaination) {
    logError("Open ai api call to create explaination for code failed ");
    return null;
  } else {
    return explaination;
  }
}

export async function getSummaryOfFile(
  codeSummary: string,
  fileName: string,
  filePath: string
): Promise<string | null> {
  const interval = commandLineLoading("Summarizing file");

  const res = await createChatCompletion(
    [
      {
        content: `Please give a summary of this file that contains code .
        This is the file name ${fileName}
        This is where the file is located ${filePath}
        And this is a summary of the code in the file ${codeSummary}
        Please provide an explaination summary of this file
          `,
        role: ChatUserType.user,
      },
    ],
    EngineName.Turbo,
    0.2
  );
  const explaination = res.choices[0].message.content;
  clearLoading(interval, `Summarizing file completed`);

  if (!explaination) {
    logError("Open ai api call to create explaination for file failed ");
    return null;
  } else {
    return explaination;
  }
}

export async function createEmbeddings(documents: Array<any>): Promise<any> {
  const interval = commandLineLoading("Creating embeddings");

  const response = await openai.createEmbedding({
    model: "text-embedding-ada-002",
    input: documents.map((d) => {
      if (!d) return "";
      return truncateStringTokens(d.replace("\n", " "), 8191);
    }),
  });
  const [{ embedding }] = response?.data?.data;
  clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
  return embedding;
}

export async function summarizeDirectoryExplaination(
  text: string,
  model?: string
): Promise<any> {
  const interval = commandLineLoading("Summarizing code");
  try {
    const remainingRequests = await limiter.removeTokens(1);
    const response = await getCompletion(text, 0.2);
    const res = response.data.choices[0].text;
    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    return res;
  } catch (error: any) {
    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    console.log(error);
  }
}

export async function createTextCompletion(
  prompt: string,
  temperature: number = 1,
  loadingMessage: string = "Loading",
  type: string = "completion"
): Promise<CompletionResponse> {
  const interval = commandLineLoading(loadingMessage + "creat text completion");

  try {
    const remainingRequests = await limiter.removeTokens(1);
    const res =
      type === "completion"
        ? await getCompletion(prompt, temperature)
        : await getChatCompletion([
            {
              role: ChatUserType.user,
              content: prompt,
            },
          ]);
    const data: CompletionResponse = res.data;
    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    return data;
  } catch (error: any) {
    if (error.response) {
      clearLoading(interval, `Error status: ${error.response.status}`);
      console.log(error.response.data);
    } else {
      clearLoading(interval, `Error status: ${error.message}`);
    }
    throw error;
  }
}

export async function createChatCompletion(
  messages: ChatMessage[],
  model?: EngineName,
  temperature: number = 1,
  maxTokens: number = 2048
): Promise<OpenAiChatCompletionResponse> {
  const interval = commandLineLoading("Loading create chat completion");
  try {
    const remainingRequests = await limiter.removeTokens(1);
    const res = model
      ? await getChatCompletion(messages, model, temperature, maxTokens)
      : await getChatCompletion(messages);
    const data: OpenAiChatCompletionResponse = res.data;
    clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
    return data;
  } catch (error: any) {
    if (error.response) {
      clearLoading(interval, `Error status >>>>>: ${error.response.status}`);
      console.log(error.response.data);

      if (error.response.status === 429) {
        console.log("Waiting 5 seconds for rate limit to reset");
        setTimeout(() => {
          console.log("Done waiting, trying again");
          return createChatCompletion(messages, model, temperature, maxTokens);
        }, 5000);
      }
    } else {
      clearLoading(interval, `Error status: ${error.message}`);
    }
    return error;
  }
}
