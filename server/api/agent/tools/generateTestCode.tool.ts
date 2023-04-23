import { ToolName } from ".";
import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import {
  createChatCompletion,
  createTextCompletion,
} from "../../openAi/openai.service";
import { updateSession } from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";
import { generateNewCodePrompt } from "./generateNewCode.prompt";
import { searchCodeTool } from "./searchCode.tool";
import { writeCompletedCodeTool } from "./writeCompletedCode.tool";

export function generateTestCodeTool(): ToolInterface {
  async function handleWriteTestCode(
    userId: string,
    sessionId: string,
    code: string
  ) {
    // This is an expensive and time consuming operation. We should only do this when we are sure that the functionality is valid.

    const isPromptToGenerateCode = await createTextCompletion(
      `Is this an example of code? ${code}. Return yes or no`,
      0.2
    );

    if (
      isPromptToGenerateCode?.choices[0].text?.toLowerCase().includes("yes")
    ) {
      const functionality = `Write a test for the following code: ${code}`;
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
        },
        "code"
      );

      return {
        output: `Here is the test code that I generated for you: ${test}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
      };
    } else {
      return {
        output: `The functionality you provided is not a valid code. Please try again.`,
      };
    }
  }

  const name = ToolName.generateTestCode;

  return {
    name,
    description:
      "Generates test code based on the code passed into the tool. Argument 'code' should be the exact code you want to write a test for.",
    use: async (userId, sessionId, code) =>
      await handleWriteTestCode(userId, sessionId, code),
    arguments: ["code"],
    promptTemplate: generateNewCodePrompt,
    availableTools: [
      name,
      searchCodeTool().name,
      writeCompletedCodeTool().name,
    ],
  };
}
