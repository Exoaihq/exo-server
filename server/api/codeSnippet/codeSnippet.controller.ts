import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { rootProjectDirectory, supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { createCodeCompletionAddToFiles } from '../../../utils/generateCode';
import { iterateOverFolder, iterateOverFolderAndHandleFile, iterateOverFolderAndHandleFileContents } from '../../../utils/iterateOverFolders';
import { createTextCompletion } from '../../../utils/openAi';
import { extractFileNameAndPath, parseCode } from '../../../utils/treeSitter';
import { createEmbeddings } from '../openai.service';
import { addCodeToSupabase, addFileToSupabase, assignCodeSnippetToFile, assignExplainationsForFilesWhereNull, findAllSnippetWithoutFiles, findFileId, findFilesWithoutExplaination, findSnippetsWithoutFilesAndAssignFiles } from './supabase.service';

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


        iterateOverFolderAndHandleFileContents(utilsDirectory, parseCode, addCodeToSupabase)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const addAllFilesToDb = async (req: Request, res: Response) => {
    try {

        const serverDirectory = rootProjectDirectory + "/server"
        const utilsDirectory = rootProjectDirectory + "/utils"
        const typeDirectory = rootProjectDirectory + "/types"

        const parentDirectory = "code-gen-server"

        async function handleFoundFile(file: string) {

            const { fileName, extractedPath } = extractFileNameAndPath(file)
            const relativeDirectory = extractedPath.split(parentDirectory)[1]

            await addFileToSupabase({
                fileName,
                filePath: relativeDirectory ? relativeDirectory : "/",
            })
        }

        iterateOverFolderAndHandleFile(rootProjectDirectory, handleFoundFile)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


export const testCodeNodeParsing = async (req: Request, res: Response) => {
    try {

        async function findFiles(directory: string) {
            const { data, error } = await supabase.from('code_snippet')
                .select('code_explaination')
                .eq('relative_file_path', directory)
            if (data && data[0]) {
                const codeExplaination = data[0].code_explaination
                console.log(codeExplaination.trim())
            }
        }

        function handleFile(file: string) {
            console.log(file)
        }

        const directory = rootProjectDirectory + "/server"

        const output = iterateOverFolder(directory, findFiles)

        // const path = "/Users/kg/Repos/code-gen-server/server/api/codeSnippet/codeSnippert.controller.ts"




        // console.log(data, error)
        // console.log(data?.length)


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

        const prompt = "Can you create a typescript react login page."

        const response = await createCodeCompletionAddToFiles(prompt, "Loading", "/Users/kg/Repos/code-gen-app/")
        console.log(response)

        res.status(200).json({ data: response })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const assignSnippetToFile = async (req: Request, res: Response) => {
    try {

        //file name = generateCode.ts
        const response = await assignCodeSnippetToFile(176, 87)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const findAllSnippetsWithoutFiles = async (req: Request, res: Response) => {
    try {

        //file name = generateCode.ts
        const response = await findAllSnippetWithoutFiles()

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const findFileById = async (req: Request, res: Response) => {
    try {

        //file name = generateCode.ts
        const response = await findFileId("generateCode.ts")

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

export const findAllSnippetsWithoutFilesAndAssign = async (req: Request, res: Response) => {
    try {

        //file name = generateCode.ts
        const response = await findSnippetsWithoutFilesAndAssignFiles()

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}


export const findAllFilesWithoutExplainations = async (req: Request, res: Response) => {
    try {

        //file name = generateCode.ts
        const response = await findFilesWithoutExplaination()

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}



export const findAllFilesWithoutExplainationsAndAddThem = async (req: Request, res: Response) => {
    try {

        //file name = generateCode.ts
        const response = await findFilesWithoutExplaination()
        console.log(response)
        const assign = assignExplainationsForFilesWhereNull(response)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}