import { CodeCompletionDetails } from "./codeCompletion.controller";


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