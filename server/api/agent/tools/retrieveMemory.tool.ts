import { Database } from "../../../../types/supabase";
import { getMemoriesById } from "../../memory/memory.service";
import { ToolInterface } from "../agent.service";

export function retrieveMemoryTool(): ToolInterface {
  async function handleStoreMemory(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    id: string
  ) {
    const memory = await getMemoriesById(id);

    return {
      output: `Here is the memory you requested: ${
        memory?.memory_text ? memory.memory_text : "No memory found"
      }`,
    };
  }

  return {
    name: "retrieve memory",
    description:
      "Retrieves a stored memory for longer tasks that require multiple steps or loops to complete.",
    use: async (user, sessionId, id) => handleStoreMemory(user, sessionId, id),
    arguments: ["memory id"],
  };
}
