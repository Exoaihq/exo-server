import { getSubstringFromMultilineCode } from "./getSubstringFromMultilineCode";

require("dotenv").config();
const Parser = require("tree-sitter")
const TypeScript = require('tree-sitter-typescript').typescript;
const fs = require('fs');


const parser = new Parser();

// TODO - will need to dynamically import the language
parser.setLanguage(TypeScript);

export interface ParseCode {
    contents: string,
    filePath: string
}

export interface ParsedCodeMetadata {
    element: any,
    filePath: string,
    type: string

}

export interface ParsedCode {
    code: string,
    metadata: ParsedCodeMetadata
}

export async function parseCode(code: ParseCode, handleSnippet: (parsedCode: ParsedCode) => void) {
    const { contents, filePath } = code

    const tree = parser.parse(contents);
    // Split the actual code into an array of lines
    const lines = contents.split('\n')

    for await (const element of tree.rootNode.children) {
        const { startPosition, endPosition, type } = element
        const codeSnippet = getSubstringFromMultilineCode(lines, startPosition.row, startPosition.column, endPosition.row, endPosition.column)

        if (handleSnippet) {
            handleSnippet({
                code: codeSnippet,
                metadata: {
                    element,
                    filePath,
                    type
                }
            })
        }
    }
}






