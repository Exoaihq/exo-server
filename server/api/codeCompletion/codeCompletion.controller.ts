import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { ChatMessage, ChatUserType } from '../../../types/chatMessage.type';
import { writeStringToFileAtLocation } from '../../../utils/appendFile';
import { createFile } from '../../../utils/createfile';
import { supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { createCodeCompletionAddToNewNamedFile } from '../../../utils/generateCode';
import { createChatCompletion, createTextCompletion } from '../openAi/openai.service';
import { checkForAllValuesInCodeCompletionDetails, refactorFunctionInAFile } from './codeCompletion.service';

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

        const initialDirectoryState = {
            projectDirectory: "",
            refactorExistingCode: false
        }

        const requiredFunctionalityInitialState = {
            projectFile: "",
            requiredFunctionality: ""
        }

        const { messages, codeDirectory, codeDetails } = req.body as CodeCompletionRequest
        const { projectDirectory, refactorExistingCode } = codeDirectory
        const { projectFile, requiredFunctionality } = codeDetails


        if (projectDirectory && refactorExistingCode === false && projectFile && requiredFunctionality) {
            const completion = await createTextCompletion(requiredFunctionality, "Loading", "chat");

            const content = completion.choices[0].message?.content ? completion.choices[0].message?.content : ""
            console.log(content)

            createFile(projectFile, content, projectDirectory)

            res.status(200).json({ data: completion })
            return
        }

        const directoryPrompt = `You an and api chatbot that is helping the user create code.
            You need to get the use to complete the following object before you can continue:
            ${JSON.stringify(initialDirectoryState, null, 2)}
            Here is the conversation so far:
            ${JSON.stringify(messages, null, 2)}
            When the object is complete, return "done!" and the object.
            Make sure to put quotes around the values.
            Ask the user questions to complete the object.
        `
        const requiredFunctionalityPrompt = `You an and api chatbot that is helping the user create code. You need to get the use to complete the following object before you can continue:
            ${JSON.stringify(requiredFunctionalityInitialState, null, 2)}
            Here is the conversation so far:
            ${JSON.stringify(messages, null, 2)}
            When the object is complete, return "done!" and the object.
            Make sure to put quotes around the values.
            Ask the user questions to complete the object
        `

        const messageStart: ChatMessage[] = [
            {
                role: ChatUserType.system,
                content: codeDirectory.projectDirectory && codeDirectory.refactorExistingCode !== null ? requiredFunctionalityPrompt : directoryPrompt
            }
        ]
        const response = await createChatCompletion(messageStart)


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