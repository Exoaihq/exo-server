import { getSubstringFromMultilineCode } from "./getSubstringFromMultilineCode";

require("dotenv").config();
const Parser = require("tree-sitter")
const TypeScript = require('tree-sitter-typescript').typescript;
const fs = require('fs');


const parser = new Parser();

// TODO - will need to dynamically import the language
parser.setLanguage(TypeScript);

export async function parseCode(code: string, handleSnippet: any) {

    const tree = parser.parse(code);
    // Split the actual code into an array of lines
    const lines = code.split('\n')

    for await (const element of tree.rootNode.children) {
        const { startPosition, endPosition } = element
        const codeSnippet = getSubstringFromMultilineCode(lines, startPosition.row, startPosition.column, endPosition.row, endPosition.column)
        console.log("code snippet>>>>>>>>>>>>>>>", codeSnippet)
        // This part is not data intensive, so maybe we should add this to the DB so that we can query it later

        // TODO - embed and store the code snippet 

        // TODO - run a gpt query to find what the code does



        // const whatDoesItDo = await generateText("What does this code snippet do" + codeSnippet, process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY : "")
        // console.log(whatDoesItDo)

        if (handleSnippet) {
            handleSnippet([{
                pageContent: codeSnippet,
                metadata: {
                    type: "code",
                    codeSnippet,
                    element
                }
            }])
        }
    }
}






