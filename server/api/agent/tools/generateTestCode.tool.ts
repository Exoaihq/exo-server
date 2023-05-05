import { ToolName } from ".";
import { removeQuotes } from "../../../../utils/findArrayInAString";
import { convertToTestFileName } from "../../../../utils/getFileName";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import {
  findFileByAccountIdAndFullFilePath,
  findFileByFileNameAndAccount,
} from "../../codeFile/codeFile.repository";
import { createTestBasedOnExistingCode } from "../../codeFile/codeFile.service";
import { createNewFileFromSnippets } from "../../codeSnippet/codeSnippet.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { updateSession } from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";
import { generateNewCodePrompt } from "./generateNewCode.prompt";

export function generateTestCodeTool(): ToolInterface {
  async function handleWriteTestCode(
    userId: string,
    sessionId: string,
    path: string
  ) {
    const account = await findOrUpdateAccount(userId);

    let fileContent = await findFileByAccountIdAndFullFilePath(
      account.id,
      path
    );

    if (!fileContent) {
      fileContent = await findFileByFileNameAndAccount(
        removeQuotes(path),
        account.id
      );
    }

    if (!fileContent || !fileContent.code_snippet) {
      return {
        output: `I found the file but it didn't contain any code. Please make sure the file has code by indexing your repository again.`,
      };
    }

    const fullFileContent = await createNewFileFromSnippets(
      fileContent.file_path + "/" + fileContent.file_name,
      account.id
    );

    if (!fullFileContent) {
      return {
        output: `I'm sorry I couldn't find the code file to generate a test for. `,
      };
    }
    const test = await createTestBasedOnExistingCode(fullFileContent);

    if (!test) {
      return {
        output: `I'm sorry I couldn't generate code for you. Please try again later.`,
      };
    }

    await updateSession(userId, sessionId, {
      code_content: test,
    });

    await findAndUpdateAiCodeBySession(
      sessionId,
      {
        code: test,
        functionality: "Write test code based on existing code",
        file_name: convertToTestFileName(
          fileContent?.file_name ? fileContent.file_name : ""
        ),
        path: fileContent?.file_path ? fileContent.file_path : "",
      },
      "code"
    );

    return {
      output: `Here is the test code that I generated for you: ${test}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
    };
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
