import { ToolName } from ".";
import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { getAiCodeBySessionOrAccount } from "../../aiCreatedCode/aiCreatedCode.repository";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { findFileByAccountIdAndFullFilePath } from "../../codeFile/codeFile.repository";
import { updateSnippetById } from "../../codeSnippet/codeSnippet.repository";
import { createChatCompletion } from "../../openAi/openai.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { updateSession } from "../../session/session.repository";
import { ToolInterface } from "../agent.service";
import { updateExistingCodePrompt } from "./updateExistingCode.prompt";

export function updateExistingCodeTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    functionality: string
  ) {
    // Find the ai generated code for this session

    let existingCodeToUpdate = [];

    const aiGeneratedCode = await getAiCodeBySessionOrAccount(sessionId);

    if (!aiGeneratedCode || aiGeneratedCode.length === 0) {
      return {
        output: `You need to find the location of the code you want to update first. Please use the "search directory" tool to find the location of the code you want to update.`,
      };
    }

    if (aiGeneratedCode && aiGeneratedCode.length > 0) {
      const aiGeneratedCodeWithoutCode = aiGeneratedCode.find(
        (aiCreatedCode) => aiCreatedCode.code === null
      );

      if (
        aiGeneratedCodeWithoutCode &&
        aiGeneratedCodeWithoutCode.path === null
      ) {
        return {
          output: `You need to find the location of the code you want to update first. Please use the "search directory" tool to find the location of the code you want to update.`,
        };
      }

      if (aiGeneratedCodeWithoutCode && aiGeneratedCodeWithoutCode.path) {
        const account = await findOrUpdateAccount(userId);
        const existingFile = (await findFileByAccountIdAndFullFilePath(
          account?.id ? account.id : "",
          aiGeneratedCodeWithoutCode.path +
            "/" +
            aiGeneratedCodeWithoutCode.file_name
        )) as {
          code_snippet: any[] | null;
        };

        if (!existingFile) {
          return {
            output: `I'm sorry I couldn't find the file you want to update. Please use the "search directory" tool to find the location of the code you want to update.`,
          };
        }

        // Does the user want to update the entire file or just a section of it?

        if (existingFile.code_snippet && existingFile.code_snippet.length > 0) {
          const snippets = existingFile.code_snippet;

          const relevantCode = await createChatCompletion([
            {
              role: ChatUserType.user,
              content: `
              Here is all the code in the file: 

              ${snippets.map((snippet) => {
                return `
                id: ${snippet.id}
                Code: ${snippet.code_string}
                `;
              })}
  
             Return the ids that are relevent to this: ${functionality}. If none return null.`,
            },
          ]);

          const existingCodeIds = relevantCode;
          console.log("existingCodeIds", existingCodeIds);

          if (existingCodeIds.includes("null")) {
            console.log("No relevant code");
          } else {
            existingCodeToUpdate = snippets.filter((snippet) => {
              return existingCodeIds.includes(snippet.id);
            });
            console.log("relevantSnippets", existingCodeToUpdate);
          }
        }
      }
    }

    const isPromptToGenerateCode = await createChatCompletion([
      {
        content: `Is this an example of a prompt to generate code? ${functionality}. Return yes or no`,
        role: ChatUserType.user,
      },
    ]);

    if (isPromptToGenerateCode.toLowerCase().includes("yes")) {
      const response = await createChatCompletion(
        [
          {
            role: ChatUserType.user,
            content: `
            Here is the code I want to update: ${existingCodeToUpdate.map(
              (snippet) => {
                return snippet.code_string;
              }
            )}\n

            Update this code: ${functionality}
            
            return the updated code with no new lines or comments.
            `,
          },
        ],
        EngineName.GPT4
      );

      const improvedCode = response ? response : null;

      if (existingCodeToUpdate.length === 1) {
        await updateSnippetById(existingCodeToUpdate[0].id, {
          updated_at: new Date().toISOString(),
          code_string: improvedCode,
        });
      }
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
          functionality,
          completed_at: new Date().toISOString(),
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

  const name = ToolName.updateExistingCode;

  return {
    name,
    description:
      "Updates existing code based on the functionality requested and writes the code back to the file. Before using this tool you must find the location of the code you want to update.",
    use: async (userId, sessionId, functionality) =>
      await handleWriteCode(userId, sessionId, functionality),
    arguments: ["code functionality"],
    promptTemplate: updateExistingCodePrompt,
    availableTools: [
      name,
      ToolName.searchCode,
      ToolName.finalAnswer,
      ToolName.searchDirectory,
    ],
  };
}
