import { ToolName } from ".";
import { removeQuotes } from "../../../../utils/findArrayInAString";
import { convertToTestFileName } from "../../../../utils/getFileName";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import {
  findFileByAccountIdAndFullFilePath,
  findFileByFileNameAndAccount,
} from "../../codeFile/codeFile.repository";
import { createTestBasedOnExistingCode } from "../../codeFile/codeFile.service";
import { updateSession } from "../../session/session.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { generateNewCodePrompt } from "./generateNewCode.prompt";

export function generateTestCodeTool(): ToolInterface {
  async function handleWriteTestCode(
    userId: string,
    sessionId: string,
    path: string
  ) {
    const account = await findOrUpdateAccount(userId);

    let file = await findFileByAccountIdAndFullFilePath(account.id, path);

    if (!file) {
      file = await findFileByFileNameAndAccount(removeQuotes(path), account.id);
    }

    if (!file || !file.file_name || !file.file_path) {
      return {
        output: `I found the file but it didn't contain all the info I need. Please make sure the file has code by indexing your repository again.`,
      };
    }

    const { content } = file;

    if (!content) {
      return {
        output: `This file does not have any content. Please make sure the file has code by indexing your repository again.`,
      };
    }

    const test = await createTestAndUpdateAiCodeAndSession(
      content,
      userId,
      sessionId,
      {
        file_name: file.file_name,
        file_path: file.file_path,
      }
    );

    if (!test) {
      return {
        output: `I'm sorry I couldn't generate code for you. Please try again later.`,
      };
    } else {
      return {
        output: `Here is the test code that I generated for you: ${test}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
      };
    }
  }

  const name = ToolName.generateTestCode;

  return {
    name,
    description:
      "Generates test code based on the existing file path passed into the tool. The file you want to write a test for has to exisit and contain valid code.",
    use: async (userId, sessionId, path) =>
      await handleWriteTestCode(userId, sessionId, path),
    arguments: ["/file/path"],
    promptTemplate: generateNewCodePrompt,
    availableTools: [
      name,
      ToolName.searchCode,
      ToolName.finalAnswer,
      ToolName.searchDirectory,
    ],
  };
}

export async function createTestAndUpdateAiCodeAndSession(
  content: string,
  userId: string,
  sessionId: string,
  file: {
    file_name: string;
    file_path: string;
  }
) {
  const test = await createTestBasedOnExistingCode(content);

  if (!test) {
    return null;
  }

  await updateSession(userId, sessionId, {
    code_content: test,
  });

  await findAndUpdateAiCodeBySession(
    sessionId,
    {
      code: test,
      functionality: "Write test code based on existing code",
      file_name: convertToTestFileName(file.file_name),
      path: file.file_path,
    },
    "code"
  );

  return test;
}
