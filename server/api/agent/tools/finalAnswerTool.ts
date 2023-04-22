import { ToolInterface } from "../agent.service";
import { finalAnswerPrompt } from "./finalAnswer.prompt";

export function finalAnswerTool(): ToolInterface {
  async function handleFinalAnser(
    userId: string,
    sessionId: string,
    text: string
  ) {
    return {
      output: text,
      metadata: "",
    };
  }

  const name = "final answer";

  return {
    name,
    description: "Tool to run when you have the final answer.",
    use: async (userId, sessionId, text) =>
      await handleFinalAnser(userId, sessionId, text),
    arguments: ["final answer"],
    promptTemplate: finalAnswerPrompt,
    availableTools: [name],
  };
}
