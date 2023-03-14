

import { createFile } from "./createfile";
import { findAllTextAfterStringAndLineBreak } from "./findTextAfterComment";
import { createTestFileName } from "./generateTestFileName";
import { findFileName } from "./getFileName";
import { removeTest } from "./removeTextAfterString";
import { createTextCompletion } from "./openAi";

const writeATestPrompt = "Write a test in the same file.";
const writeAFileNamePrompt = "Add a filename in the same file with this format: filename: <filename>.<suffix>";

function buildPromptWithTestAndFileName(prompt: string) {
  return `${prompt} ${writeATestPrompt} ${writeAFileNamePrompt}`;
}

export async function createCodeCompletion(
  prompt: string,
  apiKey: string,
  loadingMessage: string
) {
  return await createTextCompletion(
    buildPromptWithTestAndFileName(prompt), loadingMessage
  );
}

export async function createCodeCompletionAddToFiles(
  prompt: string,
  loadingMessage: string,
  location: string = "./"
) {
  const res = await createTextCompletion(
    buildPromptWithTestAndFileName(prompt), loadingMessage
  );
  try {
    let generatedCode = await res?.choices[0].text;

    const fileName = findFileName(generatedCode);
    const findTest = findAllTextAfterStringAndLineBreak(generatedCode, ".test");
    if (findTest) {
      generatedCode = removeTest(generatedCode);
      createFile(createTestFileName(fileName), findTest, location);
    }
    createFile(fileName, generatedCode, location);
  } catch (error: any) {
    console.log(error)
  }

  return res
}

export async function createCodeCompletionAddToNewNamedFile(
  prompt: string,
  loadingMessage: string,
  location: string,
  fileName: string
) {
  const res = await createTextCompletion(prompt, loadingMessage);
  try {
    let generatedCode = await res?.choices[0].text;

    createFile(fileName, generatedCode, location);
  } catch (error: any) {
    console.log(error)
  }

  return res
}