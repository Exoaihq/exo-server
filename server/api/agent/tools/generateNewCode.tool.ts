import { ChatUserType } from "../../../../types/chatMessage.type";
import { EngineName } from "../../../../types/openAiTypes/openAiEngine";
import { createChatCompletion } from "../../openAi/openai.service";
import { updateSession } from "../../supabase/supabase.service";
import { ToolInterface } from "../agent.service";

export function generateNewCodeTool(): ToolInterface {
  async function handleWriteCode(
    userId: string,
    sessionId: string,
    functionality: string
  ) {
    const response = await createChatCompletion(
      [
        {
          role: ChatUserType.user,
          content: `Wrtie the following code: ${functionality}`,
        },
      ],
      EngineName.GPT4
    );

    const improvedCode = response?.choices[0].message?.content
      ? response?.choices[0].message?.content
      : "I'm sorry I couldn't generate code for you. Please try again later.";

    await updateSession(userId, sessionId, {
      code_content: improvedCode,
    });

    return {
      output: `Here is the code that I generated for you: ${improvedCode}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
    };
  }

  return {
    name: "generate new code",
    description:
      "Generates new code based on the functionality requested and adds the code to the session so it can be written to location set by the 'set location' tool. Before using this tool you must set the location to write code to. Arguments should be as specific as possible.",
    use: async (userId, sessionId, functionality) =>
      await handleWriteCode(userId, sessionId, functionality),
    arguments: ["code functionality"],
  };
}
