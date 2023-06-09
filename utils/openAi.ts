import { CompletionResponse } from "../types/openAiTypes/openAiCompletionReqRes";
import { EngineName } from "../types/openAiTypes/openAiEngine";
import { clearLoading, commandLineLoading } from "./commandLineLoadingl";
import { openAiApiKey } from "./envVariable";
import { RateLimiter } from "limiter";

const { Configuration, OpenAIApi } = require('openai');
const { encode, decode } = require("gpt-3-encoder");

// Allow 30 requests per min (the Open api limit for embeddings). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
const limiter = new RateLimiter({ tokensPerInterval: 30, interval: "minute" });

export enum ResponseFormat {
    B64_JSON = "b64_json",
    URL = 'url'
}

const raisingHands = String.fromCodePoint(0x1F64C)



export async function createImage(prompt: string, responseFormat: ResponseFormat = ResponseFormat.URL, n: number = 2, size: string = "1024x1024",): Promise<any> {

    const configuration = new Configuration({
        apiKey: openAiApiKey
    });

    const openai = new OpenAIApi(configuration);

    const interval = commandLineLoading("Using OpenAI to generate an image");

    try {
        const res = await openai.createImage({
            prompt,
            n,
            size,
            response_format: responseFormat
        });
        const data: CompletionResponse = res.data
        clearLoading(interval, `${raisingHands} Query completed ${raisingHands}`);
        return data
    } catch (error: any) {
        if (error.response) {
            clearLoading(interval, `Error status: ${error.response.status}`);
            console.log(error.response.data);
        } else {
            clearLoading(interval, `Error status: ${error.message}`);
        }
        return error
    }
}





