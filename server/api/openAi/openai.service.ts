

import { ChatMessage } from "../../../types/chatMessage.type";
import { CompletionResponse } from "../../../types/openAiTypes/openAiCompletionReqRes";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { clearLoading, commandLineLoading } from "../../../utils/commandLineLoadingl";
import { openAiApiKey } from "../../../utils/envVariable";

import { RateLimiter } from "limiter";
import { getOpenAiModelsFromDb } from "../codeSnippet/supabase.service";
const { Configuration, OpenAIApi } = require('openai');
const { encode, decode } = require("gpt-3-encoder");

export function truncateStringTokens(str: string, maxTokens = 2046) {
    let encoded = encode(str || "");
    return decode(encoded.slice(0, maxTokens));
};

// Allow 30 requests per min (the Open api limit for embeddings). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
const limiter = new RateLimiter({ tokensPerInterval: 15, interval: "minute" });

const raisingHands = String.fromCodePoint(0x1F64C)

const configuration = new Configuration({
    apiKey: openAiApiKey
});

const openai = new OpenAIApi(configuration);

export async function getOpenAiModels() {
    try {
        return await openai.listEngines();
    } catch (error: any) {
        console.log(error)
        throw error
    }
}

export async function getChatCompletion(messages: any) {

    const availableEngines = await getOpenAiModelsFromDb()

    //TODO - fix call to db
    // const gpt4 = availableEngines?.find((engine: any) => {
    //     return engine.id === "gpt-4"
    // })

    try {
        const res =  await openai.createChatCompletion({
            model: "gpt-4",
            messages,
            max_tokens: 2048,
        });
        if (res.status === 429) {
            console.log("Too many requests")
            setTimeout(() => {
                getChatCompletion(messages)
            }, 2000)
        }
        return res
    } catch (error: any) {
        console.log(error)
        console.log(error.message)
        throw error
    }
}

export async function getCompletion(prompt: string) {

    const availableEngines = await getOpenAiModelsFromDb()

    const gpt4 = availableEngines?.find((engine: any) => {
        return engine.id === "gpt-4"
    })

    try {
        return await openai.createCompletion({
            model: "text-davinci-003",
            prompt,
            max_tokens: 2048,
            temperature: 0,
        })
    } catch (error: any) {
        console.log(error)
        throw error
    }

}

export async function getCodeCompletion(prompt: string) {
    try {
        const res = await openai.createCompletion({
            model: "text-davinci-002",
            prompt,
            temperature: 0,
            max_tokens: 1000,
            stop: "/* Command:"
        });
        return res
    } catch (error: any) {
        console.log(error)
        throw error
    }

}

export async function queryClassification(query: string) {
    const prompt = `You need to classify a query into three buckets: {code}, {question} or {chat}. Here are some examples of queries you might need to classify:\
    """\
    query: 'I need a new coat'\
    classification: chat\
    """\
    query: 'How do I create a new file in python?'\
    classification: code\
    """\
    query: 'Where should I go out to dinner in NYC?'\
    classification: question\
    return in the following format:\
    """\
    classifcation: {classification}\
    """\

    query: ${query}
    `
    try {
        const completion = await openai.createCompletion({
            prompt,
            temperature: 0,
            model: "text-davinci-003",
        })
        return completion
    } catch (error: any) {
        console.log(error)
        throw error
    }
}

export async function handlePromptAfterClassification(messages: ChatMessage[]) {

    const lastMessage = messages[messages.length - 1].content
    const completion = await queryClassification(lastMessage);
    console.log(messages)

    const getTextAfterClassification = completion.data.choices[0].text.split("classification: ")[1].trim()

    switch (getTextAfterClassification) {
        case "code":
            // const code = await getCodeCompletion(lastMessage)
            return {
                data: {
                    choices: [
                        {
                            text: "It sounds like you'd like some help with some code. Do you want to work on a specific repo or just output some code to the scratch pad?"
                        }
                    ]
                },
                type: "code"
            }
        case "question":
            const answer = await getCompletion(lastMessage)
            return {
                data: answer.data,
                type: "code"
            }
        case "chat":
            const response = await getChatCompletion(messages)
            return {
                data: response.data,
                type: "code"
            }
        default:
            const defaultResponse = await getChatCompletion(messages)
            return {
                data: defaultResponse.data,
                type: "code"
            }

    }
}


export async function createEmbeddings(documents: Array<any>, model?: string): Promise<any> {

    const response = await openai.createEmbedding({
        model: model || "text-embedding-ada-002",
        input: documents.map((d) =>
            truncateStringTokens(d.replace("\n", " "), 8191)
        ),
    });
    const [{ embedding }] = response?.data?.data
    return embedding
};

export async function createTextCompletion(prompt: string, loadingMessage: string = "Loading", type: string = "completion"): Promise<CompletionResponse> {
    const configuration = new Configuration({
        apiKey: openAiApiKey
    });

    const openai = new OpenAIApi(configuration);

    const interval = commandLineLoading(loadingMessage);

    try {
        const remainingRequests = await limiter.removeTokens(1);
        const res = type === "completion" ? await getCompletion(prompt) : await getChatCompletion([
            {
                role: "user",
                content: prompt
            }
        ])
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


export async function createChatCompletion(messages: ChatMessage[], loadingMessage: string = "Loading"): Promise<CompletionResponse> {

    const interval = commandLineLoading(loadingMessage);

    try {
        const remainingRequests = await limiter.removeTokens(1);
        const res = await getChatCompletion(messages)
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