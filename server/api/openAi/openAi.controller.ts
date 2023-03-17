import { getOpenAiModels } from "./openai.service";
import { Request, Response } from 'express';
import { updateOpenAiModels } from "../codeSnippet/supabase.service";

export const getModels = async (req: Request, res: Response) => {

    try {
        const models = await getOpenAiModels();

        await updateOpenAiModels(models.data.data.map((model: any) => {

            return {
                id: model.id,
                ready: model.ready,
                object: model.object,
            }
        }))

        res.status(200).json({ data: models.data })

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}