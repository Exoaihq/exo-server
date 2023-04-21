import { ToolInterface } from "../agent.service";

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
  return {
    name: "final answer",
    description: "Tool to run when you have the final answer.",
    use: async (userId, sessionId, text) =>
      await handleFinalAnser(userId, sessionId, text),
    arguments: ["final answer"],
  };
}
