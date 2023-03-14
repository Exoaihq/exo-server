import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { rootProjectDirectory, supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { createEmbeddings } from '../openai.service';
import { findFileByExplainationEmbedding } from '../codeSnippet/supabase.service';
import { checkForAllValuesInCodeCompletionDetails } from './codeCompletion.service';
import { createCodeCompletion, createCodeCompletionAddToFiles, createCodeCompletionAddToNewNamedFile } from '../../../utils/generateCode';

const supabase = createClient(supabaseUrl, supabaseKey)

export interface CodeCompletionDetails {
    projectDirectory: string,
    projectFile: string,
    newFunction: boolean,
    newFile: boolean,
    requiredFunctionality: string
}

/* Breaking down the code completion steps
    1. Create a new project
    2. Add to an existing project
*/

/* Types of code completion:
    1. Add to a new file
    2. Add to an existing file, new function
    3. Add to an existing file, existing function (refactor)
*/

export const handleCodeCompletion = async (req: Request, res: Response) => {
    try {

        const { projectDirectory, projectFile, newFunction, requiredFunctionality } = req.body as CodeCompletionDetails

        // TODO - will need to check the db to make sure these are present
        const check = checkForAllValuesInCodeCompletionDetails(req.body as CodeCompletionDetails)

        if (check !== "All values are present") {
            res.status(200).json({ data: check })
            return
        } else {
            const response = await createCodeCompletionAddToNewNamedFile(requiredFunctionality, "Loading", projectDirectory, projectFile)
        }

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}