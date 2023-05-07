import { ToolName } from ".";
import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { getAiCodeBySessionOrAccount } from "../../aiCreatedCode/aiCreatedCode.repository";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { updateSession } from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";
import { generateNewCodePrompt } from "./generateNewCode.prompt";

export function generateNewCodeTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    functionality: string
  ) {
    // Find the ai generated code for this session

    let codeForContext = "";

    const aiGeneratedCode = await getAiCodeBySessionOrAccount(sessionId);

    if (aiGeneratedCode && aiGeneratedCode.length > 0) {
      const aiGeneratedCodeWithoutCode = aiGeneratedCode.find(
        (aiCreatedCode) => aiCreatedCode.code === null
      );

      if (aiGeneratedCodeWithoutCode && aiGeneratedCodeWithoutCode.path) {
        // Find details on neighboring files/code
        const { path } = aiGeneratedCodeWithoutCode;
        const account = await findOrUpdateAccount(userId);
        const searchResult = await findCodeByQuery(
          path,
          account?.id ? account.id : "",
          3
        );

        codeForContext = searchResult
          .map((code: { code_string: any }) => code.code_string)
          .join("\n");
      }
    }
    console.log("Context code>>>>>>>>>>", codeForContext);

    const isPromptToGenerateCode = await createChatCompletion([
      {
        content: `Is this an example of a prompt to generate code? ${functionality}. Return yes or no`,
        role: ChatUserType.user,
      },
    ]);

    if (isPromptToGenerateCode?.toLowerCase().includes("yes")) {
      const response = await createChatCompletion(
        [
          {
            role: ChatUserType.user,
            content: `
            Here is some code for context: ${codeForContext}\n

            Write the following code: ${functionality}`,
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

      const getFileNameRes = await createChatCompletion([
        {
          role: ChatUserType.user,
          content: `What is an appropriate file name for this code? ${improvedCode}. Return only the file name.`,
        },
      ]);

      await updateSession(userId, sessionId, {
        code_content: improvedCode,
      });

      await findAndUpdateAiCodeBySession(
        sessionId,
        {
          code: improvedCode,
          functionality,
          file_name: getFileNameRes,
        },
        "code"
      );

      return {
        output: `Here is the code that I generated for you: ${improvedCode}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
        metadata: {
          stop: true,
        },
      };
    } else {
      return {
        output: `The functionality you provided is not a valid prompt to generate code. Please try again.`,
      };
    }
  }

  const name = ToolName.generateNewCode;

  return {
    name,
    description:
      "Generates new code based on the functionality requested and adds the code to the session so it can be written to the location. Before using this tool you must set the location to write code. Arguments should be as specific as possible.",
    use: async (userId, sessionId, functionality) =>
      await handleWriteCode(userId, sessionId, functionality),
    arguments: ["code functionality"],
    promptTemplate: generateNewCodePrompt,
    availableTools: [name, ToolName.searchCode, ToolName.finalAnswer],
  };
}
