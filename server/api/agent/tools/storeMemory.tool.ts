import { createMemoryWithSession } from "../../memory/memory.service";
import { ToolInterface } from "../agent.service";

export function storeMemoryTool(): ToolInterface {
  async function handleStoreMemory(
    userId: string,
    sessionId: string,
    text: string
  ) {
    const memory = await createMemoryWithSession(
      {
        memory_text: text,
      },
      sessionId
    );

    return {
      output: `I've set the text: ${text}. To retrieve this text say 'retrieve text' with the id of ${memory.id} `,
    };
  }

  return {
    name: "store text",
    description:
      "Stores text for longer tasks that require multiple steps or loops to complete.",
    use: async (userId, sessionId, memory) =>
      handleStoreMemory(userId, sessionId, memory),
    arguments: ["memory text"],
  };
}
