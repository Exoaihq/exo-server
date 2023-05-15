import { ToolName } from ".";
import {
  getAiCodeBySessionOrAccount,
  updateAiWritenCode,
} from "../../aiCreatedCode/aiCreatedCode.repository";
import { resetSession } from "../../session/session.service";

import { ToolInterface } from "../agent.service";

export function writeCompletedCodeTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    text: string
  ) {
    const aiGeneratedCode = await getAiCodeBySessionOrAccount(sessionId);

    if (aiGeneratedCode.length > 0) {
      // Get the most recent ai generated code that the location is not set to
      const findCodeReadyToWrite = aiGeneratedCode.find(
        (aiCreatedCode) =>
          aiCreatedCode.location !== null &&
          aiCreatedCode.code !== null &&
          aiCreatedCode.path !== null
      );

      if (findCodeReadyToWrite) {
        await updateAiWritenCode(findCodeReadyToWrite.id, {
          completed_at: new Date().toISOString(),
        });
        await resetSession(userId, sessionId);
        return {
          output: `I've written the code to the location you specified. I've also cleared the session of the code and location so you can write new code.`,
        };
      } else {
        return {
          output: `I can't find any code to write. You must first generate the code and set the location to write the code to.`,
        };
      }
    } else {
      return {
        output: `I can't find any code to write. You must first generate the code and set the location to write the code to.`,
      };
    }
  }

  const name = ToolName.writeCompletedCode;

  return {
    name,
    description:
      "Writes the given code functionality to the the location specified by the `set location` tool. Before using this tool you must set the location to write code to and generate the code.",
    use: async (userId, sessionId, text) =>
      await handleWriteCode(userId, sessionId, text),
    arguments: [],
    promptTemplate: "",
    availableTools: [name],
  };
}
