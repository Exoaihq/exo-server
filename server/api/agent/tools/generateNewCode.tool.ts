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

export function generateNewCodeTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    functionality: string
  ) {
    // This is an expensive and time consuming operation. We should only do this when we are sure that the functionality is valid.

    const isPromptToGenerateCode = await createTextCompletion(
      `Is this an example of a prompt to generate code? ${functionality}. Return yes or no`,
      0.2
    );

    console.log("isPromptToGenerateCode", isPromptToGenerateCode);
    if (
      isPromptToGenerateCode?.choices[0].text?.toLowerCase().includes("yes")
    ) {
      const response = await createChatCompletion(
        [
          {
            role: ChatUserType.user,
            content: `Wrtie the following code: ${functionality}`,
          },
        ],
        EngineName.GPT4
      );

      const improvedCode = response?.choices[0].message?.content
        ? response?.choices[0].message?.content
        : null;

      console.log("improvedCode", improvedCode);

      if (!improvedCode) {
        return {
          output: `I'm sorry I couldn't generate code for you. Please try again later.`,
        };
      }
      await updateSession(userId, sessionId, {
        code_content: improvedCode,
      });

      await findAndUpdateAiCodeBySession(
        sessionId,
        {
          code: improvedCode,
        },
        "code"
      );

      return {
        output: `Here is the code that I generated for you: ${improvedCode}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
      };
    } else {
      return {
        output: `The functionality you provided is not a valid prompt to generate code. Please try again.`,
      };
    }
  }

  return {
    name: "generate new code",
    description:
      "Generates new code based on the functionality requested and adds the code to the session so it can be written to the location. Before using this tool you must set the location to write code. Arguments should be as specific as possible.",
    use: async (userId, sessionId, functionality) =>
      await handleWriteCode(userId, sessionId, functionality),
    arguments: ["code functionality"],
    promptTemplate: generateNewCodePrompt,
  };
}
