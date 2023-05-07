import { createTextCompletion } from "../server/api/openAi/openai.service";
import { addCodeToTheBottonOfFile } from "./appendFile";
import { createFile } from "./createfile";
import { findAllTextAfterStringAndLineBreak } from "./findTextAfterComment";
import { createTestFileName } from "./generateTestFileName";
import { findFileName } from "./getFileName";
import { removeTest } from "./removeTextAfterString";
const fs = require("fs");

const writeATestPrompt = "Write a test in the same file.";
const writeAFileNamePrompt =
  "Add a filename in the same file with this format: filename: <filename>.<suffix>";

function buildPromptWithTestAndFileName(prompt: string) {
  return `${prompt} ${writeATestPrompt} ${writeAFileNamePrompt}`;
}

export async function createCodeCompletion(
  prompt: string,
  apiKey: string,
  loadingMessage: string
) {
  return await createTextCompletion(
    buildPromptWithTestAndFileName(prompt),
    1,
    loadingMessage
  );
}

export async function createCodeCompletionAddToFiles(
  prompt: string,
  loadingMessage: string,
  location: string = "./"
) {
  const res = await createTextCompletion(
    buildPromptWithTestAndFileName(prompt),
    1,
    loadingMessage
  );
  try {
    let generatedCode = res;
    if (!generatedCode) {
      return;
    }

    const fileName = findFileName(generatedCode);
    const findTest = findAllTextAfterStringAndLineBreak(generatedCode, ".test");
    if (findTest) {
      generatedCode = removeTest(generatedCode);
      createFile(createTestFileName(fileName), findTest, location);
    }
    createFile(fileName, generatedCode, location);
  } catch (error: any) {
    console.log(error);
  }

  return res;
}

export async function createCodeCompletionAddToNewNamedFile(
  prompt: string,
  loadingMessage: string,
  location: string,
  fileName: string
) {
  const res = await createTextCompletion(prompt, 1, loadingMessage, "chat");
  try {
    let generatedCode = res;
    if (!generatedCode) {
      return;
    }

    createFile(fileName, generatedCode, location);
  } catch (error: any) {
    console.log(error);
  }

  return res;
}

// Takes a file name, parsed the code and uses it to prompt a new function
export async function refactorFile(prompt: string, filePath: string) {
  const prefix = "Here is a function you can refactor:";

  let response = null;

  await fs.readFile(filePath, "utf8", async function (err: any, data: any) {
    if (err) throw err;

    const entirePrompt = prefix + (await data) + "\n" + prompt;
    console.log(">>>>>>>>>>", entirePrompt);
    const res = await createTextCompletion(entirePrompt, 1, "Refactoring...");
    if (res) {
      addCodeToTheBottonOfFile(filePath, res);
    }
    console.log(res);
    response = res;
    return res;
  });

  return response;
}
