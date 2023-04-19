// session holds location, file name and file path
// Once the file name and file path (or scatchpad) are known and the functionality is known you can write to the ai generated code table

import { ChatUserType } from "../../../../types/chatMessage.type";
import { Database } from "../../../../types/supabase";
import { createMessageWithUser } from "../../message/message.service";
import { ToolInterface } from "../agent.service";

export function askUserAQuestionTool(): ToolInterface {
  async function handleSearchDirectory(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    question: string
  ) {
    createMessageWithUser(
      user,
      {
        content: question,
        role: ChatUserType.assistant,
      },
      sessionId
    );

    let output = `I've asked the user the question: ${question}. Please wait for a response.`;

    return {
      output,
    };
  }

  return {
    name: "ask user",
    description: "Asks the user a question and waits for a response",
    use: async (user, sessionId, question) =>
      await handleSearchDirectory(user, sessionId, question),
    arguments: ["question"],
  };
}
