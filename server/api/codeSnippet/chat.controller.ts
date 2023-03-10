import { openAiApiKey } from "../../../utils/envVariable";
import { Request, Response } from 'express';
const { Configuration, OpenAIApi } = require('openai');

export const startChat = async (req: Request, res: Response) => {

    const configuration = new Configuration({
        apiKey: openAiApiKey
    });

    const openai = new OpenAIApi(configuration);

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