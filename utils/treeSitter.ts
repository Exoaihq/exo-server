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

export function iterateOverTree(
  parentTree: Tree,
  handleSnippet?: (text: string) => void
) {
  for (let element of parentTree.rootNode.children) {
    const {
      startPosition,
      endPosition,
      type,
      tree,
      isNamed,
      text,
      children,
      childCount,
    } = element;

    console.log("element", element);
    if (handleSnippet) {
      handleSnippet(text);
    }

    // if (children.length > 0) {
    //   for (let child of children) {
    //     iterateOverTree(child.tree, handleSnippet);
    //   }
    // }
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
