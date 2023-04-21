import {
  getAiCodeBySession,
  updateAiWritenCode,
} from "../../aiCreatedCode/aiCreatedCode.service";
import {
  findOrCreateSession,
  updateSession,
} from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";

export function setLocationToWriteCodeTool(): ToolInterface {
  async function handleGetLocation(
    userId: string,
    sessionId: string,
    text: string
  ) {
    const dbSession = await findOrCreateSession(userId, sessionId);

    await updateSession(userId, sessionId, {
      location: text,
    });

    const aiGeneratedCode = await getAiCodeBySession(sessionId);

    if (aiGeneratedCode.length > 0) {
      // Get the most recent ai generated code that the location is not set to
      const aiGeneratedCodeWithLocationNotSet = aiGeneratedCode.find(
        (aiCreatedCode) => aiCreatedCode.location === null
      );

      if (aiGeneratedCodeWithLocationNotSet) {
        await updateAiWritenCode(aiGeneratedCodeWithLocationNotSet.id, {
          location: text,
        });
      }
    }

    return {
      output: `I've set the location to write code to ${text}`,
    };
  }

  return {
    name: "set location",
    description:
      "If you know the location to write code to you can set it here. Input is either 'scratchPad' or the file path. Before using this tool you should decide if you should search for an exising code location or write new code to a new location.",
    use: async (userId, sessionId, text) =>
      handleGetLocation(userId, sessionId, text),
    arguments: ["location"],
  };
}
