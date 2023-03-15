import { Tree } from "tree-sitter";
import { ParseCode, ParsedCode, Element } from "../types/parseCode.types";
import { getSubstringFromMultilineCode } from "./getSubstringFromMultilineCode";

require("dotenv").config();
const Parser = require("tree-sitter")
const TypeScript = require('tree-sitter-typescript').typescript;
const fs = require('fs');


const parser = new Parser();

// TODO - will need to dynamically import the language
parser.setLanguage(TypeScript);



export function extractFileNameAndPath(path: string): { fileName: string, extractedPath: string } {

    const fileName = path.split('/');
    const extractedPath = fileName.slice(0, fileName.length - 1).join('/');
    return { fileName: fileName[fileName.length - 1], extractedPath }
}

export async function parseCode(code: ParseCode, handleSnippet: (parsedCode: ParsedCode) => void) {
    const { contents, filePath } = code

    const tree = parser.parse(contents);
    // Split the actual code into an array of lines
    const lines = contents.split('\n')

    await iterateOverTree(tree, lines, filePath, handleSnippet)

}

export async function iterateOverTree(tree: Tree, lines: string[], filePath: string, handleSnippet: (parsedCode: ParsedCode) => void) {
    for await (const element of tree.rootNode.children) {
        const { startPosition, endPosition, type }: Element = element
        const codeSnippet = getSubstringFromMultilineCode(lines, startPosition.row, startPosition.column, endPosition.row, endPosition.column)

        const { fileName, extractedPath } = extractFileNameAndPath(filePath)

        if (handleSnippet) {
            handleSnippet({
                code: codeSnippet,
                metadata: {
                    element,
                    filePath: extractedPath,
                    type,
                    fileName
                }
            })
        }
    }
}






