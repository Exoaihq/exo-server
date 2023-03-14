import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { rootProjectDirectory, supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { createEmbeddings } from '../openai.service';
import { findFileByExplainationEmbedding } from '../codeSnippet/supabase.service';

const supabase = createClient(supabaseUrl, supabaseKey)

export const findCodeFile = async (req: Request, res: Response) => {
    try {

        const query = "I need to find the files that handle command line loading"

        const queryEmbedding = await createEmbeddings([query])

        const response = await findFileByExplainationEmbedding(queryEmbedding)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}