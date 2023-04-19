import { Database } from "../../../../types/supabase";
import {
  findOrCreateSession,
  updateSession,
} from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";

export function setLocationToWriteCodeTool(): ToolInterface {
  async function handleGetLocation(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    const dbSession = await findOrCreateSession(user, sessionId);

    await updateSession(user, sessionId, {
      location: text,
    });

    return {
      output: `I've set the location to write code to ${text}`,
    };
  }

  return {
    name: "set location",
    description:
      "If you know the location to write code to you can set it here. Input is either 'scratchPad' or the file path. Before using this tool you should decide if you should search for an exising code location or write new code to a new location.",
    use: async (user, sessionId, text) =>
      handleGetLocation(user, sessionId, text),
    arguments: ["location"],
  };
}
