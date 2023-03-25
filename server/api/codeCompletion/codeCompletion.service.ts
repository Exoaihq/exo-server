import { ChatMessage, ChatUserType } from "../../../types/chatMessage.type";
import { parseCodeTypes } from "../../../types/parseCode.types";
import { addCodeToTheBottonOfFile } from "../../../utils/appendFile";
import { findFileAndReturnContents } from "../../../utils/fileOperations.service";
import { parseFile } from "../../../utils/treeSitter";
import { createTextCompletion } from "../openAi/openai.service";
import { CodeCompletionRequest } from "./codeCompletion.controller";
const fs = require('fs');



export async function handleUsersDirAndRefactorResponses(response: CodeCompletionRequest): Promise<ChatMessage[]> {

    const { messages, codeDirectory, codeDetails, codeContent } = response

    const initialDirectoryState = {
        projectDirectory: "",
        refactorExistingCode: null
    }

    const requiredFunctionalityInitialState = {
        projectFile: "",
        requiredFunctionality: ""
    }

    const { projectDirectory, refactorExistingCode } = codeDirectory
    const { projectFile, requiredFunctionality } = codeDetails

    const directoryPrompt = `You an and api chatbot that is helping the user create code.
        You need to get the use to complete the following object before you can continue:
        ${JSON.stringify(initialDirectoryState, null, 2)}
        Here is the conversation so far:
        ${JSON.stringify(messages, null, 2)}
        When the object is complete, return "Ok I have all the details. What would you like to do next?" and the object.
        Make sure to put quotes around the values.
        Ask the user questions to complete the object.
    `
    const requiredFunctionalityPrompt = `You an and api chatbot that is helping the user create code. You need to get the use to complete the following object before you can continue:
        ${JSON.stringify(requiredFunctionalityInitialState, null, 2)}
        Here is the conversation so far:
        ${JSON.stringify(messages, null, 2)}
        When the object is complete, return "Ok I have all the details. Do you want me to make these changes?" and the object.
        Make sure to put quotes around the values.
        Ask the user questions to complete the object
    `



    const getReleventPrompt = () => {

        if (projectDirectory && refactorExistingCode === true && projectFile && requiredFunctionality) {

            if (!codeContent) {
                return "I can't find the file you want to update"
            }
            const promptForRefactoring = `You an and api chatbot that is helping the user create code. Here is the content of the file the user wants to update:
            '''
            ${codeContent}
            '''
            And here is the refactor the user wants to make:
            ${requiredFunctionality}
            `
            return promptForRefactoring
        } else if (!projectDirectory || (projectDirectory && refactorExistingCode === null)) {
            return directoryPrompt
        } else if (codeDirectory.projectDirectory && codeDirectory.refactorExistingCode !== null && (!projectFile || !requiredFunctionality)) {
            return requiredFunctionalityPrompt
        } else {
            return "I don't know what to do"
        }
    }

    console.log(getReleventPrompt(), codeContent)

    const messageStart: ChatMessage[] = [
        {
            role: ChatUserType.system,
            content: getReleventPrompt()
        }
    ]

    return messageStart
}


export function checkForAllValuesInObject(object: any) {
    for (const key in object) {
        if (object[key] === "" || object[key] === null || object[key] === undefined) {
            return false
        }
    }
}

function nullCheck(value: string) {
    return value === "" || value === null || value === undefined
}


// Takes a file name, parsed the code and uses it to prompt a new function
export async function refactorFile(
    prompt: string,
    filePath: string
) {

    const prefix = "Here is a function you can refactor:"

    let response = null

    await fs.readFile(filePath, 'utf8', async function (err: any, data: any) {
        if (err) throw err;

        const entirePrompt = prefix + await data + "\n" + prompt
        console.log(">>>>>>>>>>", entirePrompt)
        const res = await createTextCompletion(entirePrompt, "Refactoring...");
        if (res.choices[0].text) {
            addCodeToTheBottonOfFile(filePath, res.choices[0].text);

        }
        console.log(res)
        response = res
        return res
    });

    return response

}

// This is javascript scecific
function getNameOfAFunction(fullFunction: string) {
    const splitFunction = fullFunction.split(" ")
    const functionOrConst = fullFunction.includes("function") ? "function" : "const"
    const functionIndex = splitFunction.indexOf(functionOrConst)
    return splitFunction[functionIndex + 1].replace(/[{()}]/g, '')
}

// Takes a file name, parsed the code and uses it to prompt a new function
export async function refactorFunctionInAFile(
    prompt: string,
    filePath: string,
    functionName: string
) {

    const prefix = "Here is a function you can refactor:"

    let response = null

    const fileContents = findFileAndReturnContents(filePath)

    const tree = await parseFile(fileContents)

    for await (const element of tree.rootNode.children) {
        const { type, text, startPosition, endPosition } = element

        const fullElement = element.text
        const namedChild = element.namedChildren

        if (parseCodeTypes.find((type) => type.name === element.type && type.parse)) {

            const nameOfFunction = getNameOfAFunction(fullElement)
            const match = functionName.includes(nameOfFunction)

            if (match) {
                console.log(">>>>>>>>>>", fullElement)
                return fullElement
            } else {
                console.log("Function does not exist in file")
            }
        }


    }


    return response

}