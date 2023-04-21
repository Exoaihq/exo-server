import { getMemoriesById } from "../../memory/memory.service";
import { ToolInterface } from "../agent.service";

export function retrieveMemoryTool(): ToolInterface {
  async function handleStoreMemory(
    userId: string,
    sessionId: string,
    id: string
  ) {
    const memory = await getMemoriesById(id);

    return {
      output: `Here is the text you requested: ${
        memory?.memory_text ? memory.memory_text : "No text found"
      }`,
    };
  }

  return {
    name: "retrieve text",
    description:
      "Retrieves stored text for longer tasks that require multiple steps or loops to complete.",
    use: async (userId, sessionId, id) =>
      handleStoreMemory(userId, sessionId, id),
    arguments: ["text id"],
  };
}
