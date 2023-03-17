import { Tree, SyntaxNode } from "tree-sitter";
import { ParseCode, ParsedCode, Element } from "../types/parseCode.types";
import { getSubstringFromMultilineCode } from "./getSubstringFromMultilineCode";

//https://github.com/tree-sitter/tree-sitter-javascript/blob/7a29d06274b7cf87d643212a433d970b73969016/src/node-types.json

// javascript node types ^

require("dotenv").config();
const Parser = require("tree-sitter")
const TypeScript = require('tree-sitter-typescript').typescript;
const fs = require('fs');


const parser = new Parser();

// TODO - will need to dynamically import the language
parser.setLanguage(TypeScript);


export async function parseFile(fileContents: string): Promise<Tree> {
    return await parser.parse(fileContents)
}


export function extractFileNameAndPathFromFullPath(path: string): { fileName: string, extractedPath: string } {

    const fileName = path.split('/');
    const extractedPath = fileName.slice(0, fileName.length - 1).join('/');
    return { fileName: fileName[fileName.length - 1], extractedPath }
}

export async function parseCode(code: ParseCode, handleSnippet: (parsedCode: ParsedCode) => void) {
    const { contents, filePath } = code

    const tree = await parseFile(contents);
    // Split the actual code into an array of lines
    const lines = contents.split('\n')

    await iterateOverTree(tree, lines, filePath, handleSnippet)
}

export async function iterateOverTree(tree: Tree, lines: string[], filePath: string, handleSnippet: (parsedCode: ParsedCode) => void) {
    for await (const element of tree.rootNode.children) {
        const { startPosition, endPosition, type }: Element = element
        const codeSnippet = getSubstringFromMultilineCode(lines, startPosition.row, startPosition.column, endPosition.row, endPosition.column)

        const { fileName, extractedPath } = extractFileNameAndPathFromFullPath(filePath)

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






