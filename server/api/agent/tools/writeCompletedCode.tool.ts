import { Database } from "../../../../types/supabase";
import { createAiWritenCode } from "../../aiCreatedCode/aiCreatedCode.service";
import { findOrCreateSession } from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";

export function writeCompletedCodeTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    text: string
  ) {
    const dbSession = await findOrCreateSession(userId, sessionId);
    const { location, code_content } = dbSession;

    await createAiWritenCode({
      session_id: sessionId,
      code: code_content,
      location,
    });

    // await resetSession(userId, sessionId);

    return {
      output: `I've written the code to the location you specified. I've also cleared the session of the code and location so you can write new code.`,
    };
  }
  return {
    name: "write code",
    description:
      "Writes the given code functionality to the the location specified by the `set location` tool. Before using this tool you must set the location to write code to and generate the code.",
    use: async (userId, sessionId, text) =>
      await handleWriteCode(userId, sessionId, text),
    arguments: [],
  };
}
