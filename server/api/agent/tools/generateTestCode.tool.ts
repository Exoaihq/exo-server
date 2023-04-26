import { ToolName } from ".";
import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { convertToTestFileName } from "../../../../utils/getFileName";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { findFileByAccountIdAndFullFilePath } from "../../codeFile/codeFile.repository";
import { createNewFileFromSnippets } from "../../codeSnippet/codeSnippet.service";
import { createChatCompletion } from "../../openAi/openai.service";
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

    const fileContent = await findFileByAccountIdAndFullFilePath(
      account.id,
      path
    );

    if (!fileContent) {
      return {
        output: `I couldn't find the the file based on the path you provided: ${path}. Please use the search directory tool to find the file path.`,
      };
    }

    if (!fileContent.code_snippet) {
      return {
        output: `I found the file but it didn't contain any code. Please make sure the file has code by indexing your repository again.`,
      };
    }

    const functionality = `Write a test for the following code: ${await createNewFileFromSnippets(
      path,
      userId
    )}`;
    const response = await createChatCompletion(
      [
        {
          role: ChatUserType.user,
          content: functionality,
        },
      ],
      EngineName.GPT4
    );
    const test =
      response?.choices[0].message?.content &&
      response?.choices[0].message?.content;

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
        functionality,
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
    arguments: ["file path"],
    promptTemplate: generateNewCodePrompt,
    availableTools: [
      name,
      ToolName.searchCode,
      ToolName.finalAnswer,
      ToolName.searchDirectory,
    ],
  };
}