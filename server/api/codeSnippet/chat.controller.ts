import { openAiApiKey } from "../../../utils/envVariable";
import { Request, Response } from 'express';
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
    apiKey: openAiApiKey
});

const openai = new OpenAIApi(configuration);

async function getChatCompletion(messages: any) {
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

async function getCompletion(prompt: string) {
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

async function getCodeCompletion(prompt: string) {
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


async function queryClassification(query: string) {
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

export const startClassification = async (req: Request, res: Response) => {


    try {
        const messages = req.body ? req.body : [];

        const lastMessage = messages[messages.length - 1].content
        const completion = await queryClassification(lastMessage);

        const getTextAfterClassification = completion.data.choices[0].text.split("classification: ")[1].trim()

        console.log(getTextAfterClassification)
        switch (getTextAfterClassification) {
            case "code":
                const code = await getCodeCompletion(lastMessage)
                res.status(200).json({ data: code.data, type: "code" })
                break;
            case "question":
                const answer = await getCompletion(lastMessage)
                res.status(200).json({ data: answer.data, type: "answer" })
                break;
            case "chat":
                const response = await getChatCompletion(messages)
                res.status(200).json({ data: response.data, type: "chat" })
                break;
            default:
                const defaultResponse = await getChatCompletion(messages)
                res.status(200).json({ data: defaultResponse.data, type: "chat" })
        }

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const startChat = async (req: Request, res: Response) => {


    try {
        const messages = req.body ? req.body : [];
        console.log(messages)
        const completion = await openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages,
        });

        res.status(200).json({ data: completion.data })

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const runJavaScript = async (req: Request, res: Response) => {


    const prompt = "You are GPT-3, and you can't do math.\
    You can do basic math, and your memorization abilities are impressive, but you can't do any complex calculations that a human could not do in their head. You also have an annoying tendency to just make up highly specific, but wrong, answers.\
    So we hooked you up to a javaScript kernel, and now you can execute code. If anyone gives you a hard math problem, just use this format and well take care of the rest:\
    Question: ${ {Question with hard calculation.} }\
    ```javaScript\
    \${{ Code that prints what you need to know }}\
    ```\
        ```output\
    ${{ Output of your code }}\
    ```\
    Answer: ${ { Answer } }\
    Otherwise, use this simpler format:\
    Question: ${ {Question without hard calculation } }\
    Answer: ${ { Answer } }\
    Begin.\
        Question: What is 37593 * 67 ?\
    ```javaScript\
    console.log(37593 * 67)\
    ```\
    ```output\
    2518731\
    ```\
    Answer: 2518731\
    Question: What is the 13 raised to the .345 power\
    "

    try {

        const completion = await openai.createCompletion({
            model: "text-davinci-003",
            prompt,
        });
        console.log(completion.data)
        res.status(200).json({ data: completion.data })

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}