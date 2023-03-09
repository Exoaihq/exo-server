import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl, rootProjectDirectory } from '../../../utils/envVariable';
import { folderLooper } from '../../../utils/iterateOverFolders';
import { parseCode } from '../../../utils/treeSitter';

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey)

export const getCodeSnippet = async (req: Request, res: Response) => {
    try {

        const { data, error } = await supabase.from('code_snippet').select('*')
        console.log(data, error)

        const codeSnippet = "Hello, this is Express + asdfsadasdfasdfasdfsadfasdfsadfdsa";
        res.status(200).json({ data })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


export const createCodeSnippet = async (req: Request, res: Response) => {
    try {

        // Loop through the code base and add each code snippet to the database
        // Include the code emdedding, the code explaination and the code explaination embedding

        const { data, error } = await supabase
            .from('code_snippet')
            .insert([
                {
                    code_string: '<h2>Another example here</h2>', code_explaination: 'Other example of code', code_explaination_embedding: null, code_embedding: null
                },
            ])

        console.log(data, error)

        res.status(200).json({ data })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


export const testParser = async (req: Request, res: Response) => {
    try {

        // Loop through the code base and add each code snippet to the database
        // Include the code emdedding, the code explaination and the code explaination embedding

        const serverDirectory = rootProjectDirectory + "/server"
        const utilsDirectory = rootProjectDirectory + "/utils"

        function handleSnippert(snippet: any) {
            console.log({
                pageContent: snippet,
                metadata: {
                    type: "code",
                    codeSnippet: snippet,
                    element: "1"
                }
            })
        }

        folderLooper(utilsDirectory, parseCode, handleSnippert)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}