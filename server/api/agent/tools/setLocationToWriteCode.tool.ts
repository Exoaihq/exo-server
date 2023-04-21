import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { updateSession } from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";
import { setLocationPrompt } from "./setLocationToWriteCode.prompt";

export function setLocationToWriteCodeTool(): ToolInterface {
  async function handleGetLocation(
    userId: string,
    sessionId: string,
    text: string
  ) {
    await updateSession(userId, sessionId, {
      location: text,
    });

    await findAndUpdateAiCodeBySession(
      sessionId,
      {
        location: text,
      },
      "location"
    );

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
    promptTemplate: setLocationPrompt,
  };
}
// The code for a function to calculate factorial has been written to /Users/kg/Repos/code-gen-app/src/utils/factorial.js.
