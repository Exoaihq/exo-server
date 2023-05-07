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

export function writeCodeToScratchPadTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    functionality: string
  ) {
    // This is an expensive and time consuming operation. We should only do this when we are sure that the functionality is valid.

    const isPromptToGenerateCode = await createTextCompletion(
      `Is this an example of a prompt to generate code? 
      
      Prompt: ${functionality}.

      Is that prompt an example of a prompt to generate code?
      
      Return yes or no`,
      0.2
    );

    console.log("isPromptToGenerateCode", isPromptToGenerateCode);
    if (isPromptToGenerateCode.toLowerCase().includes("yes")) {
      const response = await createChatCompletion(
        [
          {
            role: ChatUserType.user,
            content: functionality,
          },
        ],
        EngineName.GPT4
      );

      const improvedCode = response ? response : null;

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
          location: "scratchPad",
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

  const name = ToolName.writeCodeToScarchPad;

  return {
    name,
    description:
      "If the user wants to add code to the scrarch pad, this generates new code based on the functionality requested and adds the code to the scratch pad. Arguments should be as specific as possible, outlining what the code should do.",
    use: async (userId, sessionId, functionality) =>
      await handleWriteCode(userId, sessionId, functionality),
    arguments: ["code functionality"],
    promptTemplate: generateNewCodePrompt,
    availableTools: [name, ToolName.finalAnswer],
  };
}
