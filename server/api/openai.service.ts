

import { ChatMessage } from "../../types/chatMessage.type";
import { openAiApiKey } from "../../utils/envVariable";
const { Configuration, OpenAIApi } = require('openai');


const configuration = new Configuration({
    apiKey: openAiApiKey
});

const openai = new OpenAIApi(configuration);

export async function getChatCompletion(messages: any) {
    try {
        return await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages,
        });
    } catch (error: any) {
        console.log(error)
        throw error
    }
}

export async function getCompletion(prompt: string) {
    try {
        return await openai.createCompletion({
            model: "text-davinci-003",
            prompt,
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

    const getTextAfterClassification = completion.data.choices[0].text.split("classification: ")[1].trim()

    switch (getTextAfterClassification) {
        case "code":
            const code = await getCodeCompletion(lastMessage)
            return {
                data: code.data,
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