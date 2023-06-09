import { askUserAQuestionTool } from "./askUserAQuestion.tool";
import { finalAnswerTool } from "./finalAnswerTool";
import { findDirectoryTool } from "./findDirectory.tool";
import { findFileTool } from "./findFile.tool";
import { generateNewCodeTool } from "./generateNewCode.tool";
import { generateTestCodeTool } from "./generateTestCode.tool";
import { getExisitingCodeTool } from "./getCode.tool";
import { retrieveMemoryTool } from "./retrieveMemory.tool";
import { searchCodeTool } from "./searchCode.tool";
import { searchDirectoryTool } from "./searchDirectory.tool";
import { searchFilesTool } from "./searchFiles.tool";
import { searchTestsTool } from "./searchTests.tool";
import { writeCompletedCodeTool } from "./writeCompletedCode.tool";

export * from "./askUserAQuestion.tool";
export * from "./findDirectory.tool";
export * from "./findFile.tool";
export * from "./generateNewCode.tool";
export * from "./getCode.tool";
export * from "./retrieveMemory.tool";
export * from "./searchCode.tool";
export * from "./searchDirectory.tool";
export * from "./storeMemory.tool";
export * from "./writeCompletedCode.tool";

export enum ToolName {
  searchCode = "search code",
  searchDirectory = "search directory",
  searchTests = "search tests",
  findFile = "find one file",
  findDirectory = "find one directory",
  generateNewCode = "generate new code",
  generateTestCode = "generate test code",
  askUser = "ask user",
  storeText = "store text",
  retrieveText = "retrieve text",
  writeCompletedCode = "write completed code",
  getExisitingCode = "get exisiting code",
  finalAnswer = "final answer",
  updateExistingCode = "update existing code",
  writeCodeToScarchPad = "write code to scratch pad",
  searchFiles = "search files",
}

export const allTools = [
  searchCodeTool(),
  searchDirectoryTool(),
  findFileTool(),
  generateNewCodeTool(),
  askUserAQuestionTool(),
  findDirectoryTool(),
  retrieveMemoryTool(),
  // writeCompletedCodeTool(),
  getExisitingCodeTool(),
  finalAnswerTool(),
  generateTestCodeTool(),
  searchTestsTool(),
  searchFilesTool(),
  generateTestCodeTool(),
];
