import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js'
import { supabaseKey, supabaseUrl, rootProjectDirectory } from '../../../utils/envVariable';
import { folderLooper } from '../../../utils/iterateOverFolders';
import { parseCode, ParsedCode } from '../../../utils/treeSitter';
import { createEmbeddings, createTextCompletion } from '../../../utils/openAi';
import { CompletionResponse } from '../../../types/openAiTypes/openAiCompletionReqRes';
import { createCodeCompletionAddToFiles } from '../../../utils/generateCode';

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey)

export const helloWorld = async (req: Request, res: Response) => {
    try {

        const hello = "Hello, this is Express + asdfsadasdfasdfasdfsadfasdfsadfdsa";
        res.status(200).json({ hello })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

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
        const exampleDirectory = rootProjectDirectory + "/example"
        const typeDirectory = rootProjectDirectory + "/types"

        async function handleSnippet(snippet: ParsedCode) {
            // TODO - run a gpt query to find what the code does

            const codeExplaination = await createTextCompletion("What does this code snippet do: return only one string" + snippet.code)

            const code_embedding = await createEmbeddings([snippet.code])

            let code_explaination = null
            let code_explaination_embedding = null

            if (codeExplaination && codeExplaination.choices && codeExplaination.choices[0] && codeExplaination.choices[0].text) {
                const { choices } = codeExplaination
                code_explaination = choices[0].text
                const e = await createEmbeddings([code_explaination])
                code_explaination_embedding = e[0]
            }

            code_explaination_embedding = await createEmbeddings([code_explaination])


            const dbRecord = {
                code_string: snippet.code,
                code_explaination,
                code_explaination_embedding,
                code_embedding,
                relative_file_path: snippet.metadata.filePath,
                parsed_code_type: snippet.metadata.type,
            }

            const { data, error } = await supabase
                .from('code_snippet')
                .insert([dbRecord])

            console.log(data, error)
        }

        folderLooper(typeDirectory, parseCode, handleSnippet)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


export const testOpenAi = async (req: Request, res: Response) => {
    try {

        const response = await createTextCompletion("Can you build a model of an express server?", "Loading")
        console.log(response)

        res.status(200).json({ data: response })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const searchCodeEmbeddings = async (req: Request, res: Response) => {
    try {

        const code = "const express = require('express'); const app = express(); const port = 3000; app.get('/', (req, res) => res.send('Hello World!')); app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`));"

        const code_embedding = await createEmbeddings([code])

        const query = {
            query_embedding: code_embedding,
            similarity_threshold: 0.80,
            match_count: 10,
        }

        const { data, error } = await supabase.rpc("match_code", query)
        console.log(data, error)

        res.status(200).json({ data })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const generateCode = async (req: Request, res: Response) => {
    try {

        const prompt = "Can you create a html page with chatbot functionality?"

        const response = await createCodeCompletionAddToFiles(prompt, "Loading")
        console.log(response)

        res.status(200).json({ data: response })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}