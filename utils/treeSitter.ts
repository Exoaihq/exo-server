import { Tree } from "tree-sitter";
import { Element, ParseCode, ParsedCode } from "../types/parseCode.types";
import { extractFileNameAndPathFromFullPath } from "./getFileName";
import { getSubstringFromMultilineCode } from "./getSubstringFromMultilineCode";
import { getDiffAndParse } from "./git.service";

//https://github.com/tree-sitter/tree-sitter-javascript/blob/7a29d06274b7cf87d643212a433d970b73969016/src/node-types.json

// javascript node types ^

require("dotenv").config();
const Parser = require("tree-sitter");
const TypeScript = require("tree-sitter-typescript").typescript;
const fs = require("fs");

const parser = new Parser();

// TODO - will need to dynamically import the language
parser.setLanguage(TypeScript);

export async function parseFile(fileContents: string): Promise<Tree> {
  return await parser.parse(fileContents);
}

export async function parseCode(
  code: ParseCode,
  handleSnippet: (parsedCode: ParsedCode) => void
) {
  const { contents, filePath } = code;

  const tree = await parseFile(contents);
  // Split the actual code into an array of lines
  const lines = contents.split("\n");

  await iterateOverTree(tree, lines, filePath, handleSnippet);
}

export async function iterateOverTree(
  tree: Tree,
  lines: string[],
  filePath: string,
  handleSnippet: (parsedCode: ParsedCode) => void
) {
  const { fileName, extractedPath } =
    extractFileNameAndPathFromFullPath(filePath);

  // const diff = await getDiffAndParse()

  for await (const element of tree.rootNode.children) {
    const { startPosition, endPosition, type }: Element = element;
    const codeSnippet = getSubstringFromMultilineCode(
      lines,
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column
    );

    // diff.forEach((element) => {
    //     const elementFileName = extractFileNameAndPathFromFullPath(element.fileName).fileName

    //     if (elementFileName === fileName) {

    //         element.changedLines.forEach((line) => {
    //             if (inRange(line, startPosition.row, endPosition.row)) {
    //                 console.log("match")
    //                 // This code snippet needs to be update in the DB
    //                 // TODO - update the code snippet in DB
    //                 console.log(codeSnippet)
    //                 console.log(startPosition, endPosition)
    //             }
    //         })
    //         // console.log("match")
    //         // console.log(element.changedLines)
    //         // console.log(startPosition, endPosition)

    //     }
    // })

    if (handleSnippet) {
      await handleSnippet({
        code: codeSnippet,
        metadata: {
          element,
          filePath: extractedPath,
          type,
          fileName,
        },
      });
    }
  }
}

export const getParsedSnippetFromCodeBlock = async (
  codeWithLineBreaks: string
): Promise<ParsedCode> => {
  const tree = await parseFile(codeWithLineBreaks);
  const lines = codeWithLineBreaks.split("\n");

  const addBackNewLine = lines.map((line: any) => `${line}\n`);

  const element = tree.rootNode.children.entries().next().value[1];
  console.log("element", element);
  const codeSnippet = getSubstringFromMultilineCode(
    addBackNewLine,
    element.startPosition.row,
    element.startPosition.column,
    element.endPosition.row,
    element.endPosition.column
  );
  return {
    code: codeSnippet,
    metadata: {
      element: element,
      filePath: "",
      type: element.type,
      fileName: "",
    },
  };
};
