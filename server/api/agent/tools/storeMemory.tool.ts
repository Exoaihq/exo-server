import { Database } from "../../../../types/supabase";
import { createMemoryWithSession } from "../../memory/memory.service";
import { ToolInterface } from "../agent.service";

export function storeMemoryTool(): ToolInterface {
  async function handleStoreMemory(
    user: Database["public"]["Tables"]["users"]["Row"],
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
      output: `I've set the memory ${text}. To retrieve this memory say 'retrieve memory' with the id of ${memory.id} `,
    };
  }

  return {
    name: "store memory",
    description:
      "Stores memories for longer tasks that require multiple steps to complete.",
    use: async (user, sessionId, memory) =>
      handleStoreMemory(user, sessionId, memory),
    arguments: ["memory text"],
  };
}
