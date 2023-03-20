import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { ChatMessage, ChatUserType } from '../../../types/chatMessage.type';
import { overwriteFile, writeStringToFileAtLocation } from '../../../utils/appendFile';
import { createFile } from '../../../utils/createfile';
import { supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { createChatCompletion, createTextCompletion } from '../openAi/openai.service';
import { handleUsersDirAndRefactorResponses } from './codeCompletion.service';

const supabase = createClient(supabaseUrl, supabaseKey)

export interface CodeDirectory {
    projectDirectory: string,
    refactorExistingCode: boolean
}

export interface CodeCompletionRequest {
    messages: ChatMessage[],
    codeDirectory: CodeDirectory
    codeDetails: CodeCompletionDetails
}

export interface CodeCompletionDetails {
    projectFile: string,
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

//The project directory is /Users


export const handleCodeCompletion = async (req: Request, res: Response) => {
    try {


        const { messages, codeDirectory, codeDetails } = req.body as CodeCompletionRequest
        const { projectDirectory, refactorExistingCode } = codeDirectory
        const { projectFile, requiredFunctionality } = codeDetails



        // If the user has providerd the project directory, refactor existing code, project file and required functionality then create the file with the functionality

        let newFile = false
        let updateFile = false

        if (projectDirectory && refactorExistingCode === false && projectFile && requiredFunctionality) {
            newFile = true
        }

        if (projectDirectory && refactorExistingCode === true && projectFile && requiredFunctionality) {
            updateFile = true
        }

        const messageStart = await handleUsersDirAndRefactorResponses(req.body as CodeCompletionRequest)

        const response = await createChatCompletion(newFile ? [{
            role: ChatUserType.user,
            content: requiredFunctionality
        }] : messageStart)

        if (newFile) {
            const content = response.choices[0].message?.content ? response.choices[0].message?.content : ""
            const splitOnQuotes = content.split("```")
            createFile(projectFile, splitOnQuotes[1], projectDirectory)

            // @ts-ignore
            response.choices[0].message.content = splitOnQuotes[0]

        }

        if (updateFile) {
            const content = response.choices[0].message?.content ? response.choices[0].message?.content : ""
            if (content) {
                const splitOnQuotes = content.split("```")
                overwriteFile(projectDirectory + "/" + projectFile, splitOnQuotes[1])
                // @ts-ignore
                response.choices[0].message.content = splitOnQuotes[0]
            }
        }

        res.status(200).json({ data: response });


        // const response = await refactorFunctionInAFile(requiredFunctionality, projectDirectory + "/" + projectFile, "getTomorrow")



    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}

const fun = "export async function findAllSnippetWithoutFiles(): Promise<SnippetWithoutFiles[] | null> {\n const { data, error } = await supabase.from('code_snippet')\n.select('file_name, id').is('code_file_id', null)\n if (error) {console.log(error)return null}if (!data) {return null}return data}\n"


export const addToSpecificFileLocation = async (req: Request, res: Response) => {
    try {

        const location = "/Users/kg/Repos/code-gen-server/example/example.ts"

        const response = await writeStringToFileAtLocation(location, fun, 14)

        res.status(200).json({ data: "done" })
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
}