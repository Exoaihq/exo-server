import { Tree } from "tree-sitter";
import { ParsedCode } from "../types/parseCode.types";
import { getSubstringFromMultilineCode } from "./getSubstringFromMultilineCode";

//https://github.com/tree-sitter/tree-sitter-javascript/blob/7a29d06274b7cf87d643212a433d970b73969016/src/node-types.json

// javascript node types ^

const Parser = require("tree-sitter");
const TypeScript = require("tree-sitter-typescript").typescript;
const Python = require("tree-sitter-python").python;
const Java = require("tree-sitter-java").java;
const fs = require("fs");

const parsers = {
  typeScript: TypeScript,
  python: Python,
  java: Java,
};

export enum Language {
  TypeScript = "typescript",
  Python = "python",
  Java = "java",
}

export const getProgrammingLanguage = (fileName: string): Language => {
  const fileExtension = fileName.split(".").pop();

  // TODO - add more languages. Use LLM to determine language if file extension is not available
  switch (fileExtension) {
    case "ts":
      return Language.TypeScript;
    case "py":
      return Language.Python;
    case "java":
      return Language.Java;
    default:
      return Language.TypeScript;
  }
};

function getParser(language: Language) {
  switch (language) {
    case Language.TypeScript:
      return TypeScript;
    case Language.Python:
      return Python;
    case Language.Java:
      return Java;
    default:
      return TypeScript;
  }
}

export async function parseFile(
  fileContents: string,
  language: Language
): Promise<Tree> {
  const parser = new Parser();
  console.log("language", language);

  parser.setLanguage(getParser(language));

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
  const tree = await parseFile(codeWithLineBreaks, Language.TypeScript);
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
