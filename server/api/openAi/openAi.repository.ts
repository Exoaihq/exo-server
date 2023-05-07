// This is the lowest (or highest) level - it interacts with open ai api directly.

import { RateLimiter } from "limiter";
import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import {
  clearLoading,
  commandLineLoading,
} from "../../../utils/commandLineLoadingl";
import { openAiApiKey } from "../../../utils/envVariable";
import { logError } from "../../../utils/commandLineColors";

const { Configuration, OpenAIApi } = require("openai");
const { encode, decode } = require("gpt-3-encoder");

const configuration = new Configuration({
  apiKey: openAiApiKey,
});

const openai = new OpenAIApi(configuration);

export function truncateStringTokens(str: string, maxTokens = 2046) {
  let encoded = encode(str || "");
  return decode(encoded.slice(0, maxTokens));
}

// Allow 30 requests per min (the Open api limit for embeddings). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
const limiter = new RateLimiter({ tokensPerInterval: 15, interval: "minute" });

export async function baseCreateChat(
  messages: ChatMessage[],
  model: EngineName = EngineName.Turbo,
  temperature: number = 1,
  maxTokens: number = 2048,
  stop: string[] | null = null,
  loadingMessage: string = "Loading create chat completion"
): Promise<string> {
  const interval = commandLineLoading(loadingMessage);
  try {
    const remainingRequests = await limiter.removeTokens(1);
    const res = await openai.createChatCompletion({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stop,
    });
    if (res.status === 429) {
      console.log("Too many requests");
      setTimeout(() => {
        baseCreateChat(messages, model, temperature, maxTokens);
      }, 2000);
    }
    clearLoading(interval, ` Query completed`);
    return res?.data?.choices[0]?.message?.content;
  } catch (error: any) {
    clearLoading(interval, `Query failed`);
    logError(error.response.data.error.message);
    return "";
  }
}

export async function getOpenAiModels() {
  try {
    return await openai.listEngines();
  } catch (error: any) {
    console.log(error);
    throw error;
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
  clearLoading(interval, `Embedding completed`);
  return embedding;
}

export async function getTexCompletionUsingDavinci(
  prompt: string,
  temperature: number = 1,
  stop: string[] | null = null
): Promise<string> {
  try {
    const res = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: truncateStringTokens(prompt, 2048),
      max_tokens: 2048,
      temperature,
      stop,
    });

    return res?.data?.choices[0]?.text;
  } catch (error: any) {
    console.log(error);
    return error;
  }
}

export async function getCompletionDefaultStopToken(
  prompt: string,
  temperature: number = 0
): Promise<string> {
  try {
    const res = await openai.createCompletion({
      model: "text-davinci-002",
      prompt,
      max_tokens: 2048,
      temperature,
    });
    return res?.data?.choices[0]?.text;
  } catch (error: any) {
    console.log(error);
    return "";
  }
}
