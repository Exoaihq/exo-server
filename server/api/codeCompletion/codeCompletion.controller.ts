import { createClient } from '@supabase/supabase-js';
import { Request, Response } from 'express';
import { ChatMessage, ChatUserType } from '../../../types/chatMessage.type';
import { CompletionResponse } from '../../../types/openAiTypes/openAiCompletionReqRes';
import { writeStringToFileAtLocation } from '../../../utils/appendFile';
import { supabaseKey, supabaseUrl } from '../../../utils/envVariable';
import { checkSession } from '../codeSnippet/supabase.service';
import { createChatCompletion } from '../openAi/openai.service';
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

export enum CodeCompletionResponseType {
    newFile = "newFile",
    updateFile = "updateFile",
}

export interface CodeCompletionResponseMetadata {
    type: CodeCompletionResponseType | undefined
    projectDirectory: string,
    projectFile: string,
}


export interface CodeCompletionResponse {
    openAiResponse: CompletionResponse,
    metadata: CodeCompletionResponseMetadata
}


export const handleCodeCompletion = async (req: Request, res: Response) => {
    try {

       const { access_token, refresh_token } = req.headers

       if (!access_token || !refresh_token) {
        res.status(401).json({ message: "You have to be logged in to do that" });
    }

       const access = access_token as string
       const refresh = refresh_token as string

        const session = await checkSession({access_token: access, refresh_token: refresh})
        
   
        if (!session || !session.data?.user) {
            res.status(401).json({ message: "You have to be logged in to do that" });
        }
    

        const { messages, codeDirectory, codeDetails } = req.body as CodeCompletionRequest
        const { projectDirectory, refactorExistingCode } = codeDirectory
        const { projectFile, requiredFunctionality } = codeDetails

        let fileType;

        if (projectDirectory && refactorExistingCode === false && projectFile && requiredFunctionality) {
            fileType = CodeCompletionResponseType.newFile
        }

        if (projectDirectory && refactorExistingCode === true && projectFile && requiredFunctionality) {
            fileType = CodeCompletionResponseType.updateFile
        }

        const messageStart = await handleUsersDirAndRefactorResponses(req.body as CodeCompletionRequest)

        const response = await createChatCompletion(fileType === CodeCompletionResponseType.newFile ? [{
            role: ChatUserType.user,
            content: requiredFunctionality
        }] : messageStart)

        const completionResponse: CodeCompletionResponse = {
            openAiResponse: response,
            metadata: {
                type: fileType,
                projectDirectory,
                projectFile
            }
        }

        res.status(200).json({ data: completionResponse });


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