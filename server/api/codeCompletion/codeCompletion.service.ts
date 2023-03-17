import { parseCodeTypes } from "../../../types/parseCode.types";
import { addCodeToTheBottonOfFile } from "../../../utils/appendFile";
import { findFileAndReturnContents } from "../../../utils/fileOperations.service";
import { parseFile } from "../../../utils/treeSitter";
import { createTextCompletion } from "../openAi/openai.service";
import { CodeCompletionDetails } from "./codeCompletion.controller";
const fs = require('fs');


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


export function checkForAllValuesInCodeCompletionDetails(object: CodeCompletionDetails) {
    if (nullCheck(object.projectDirectory)) {
        return "What project directory are we working in?"
    } else if (nullCheck(object.projectFile)) {
        return "What file are we working in?"
    } else if (object.newFile === null) {
        return "Are we creating a new file?"
    } else if (object.newFunction === null) {
        return "Are we creating a new function?"
    } else if (nullCheck(object.requiredFunctionality)) {
        return "What functionality are we trying to add?"
    } else {
        return "All values are present"
    }
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