// session holds location, file name and file path
// Once the file name and file path (or scatchpad) are known and the functionality is known you can write to the ai generated code table

import { ChatUserType } from "../../../../types/chatMessage.type";
import { createMessageWithUser } from "../../message/message.service";
import { ToolInterface } from "../agent.service";
import { askUserAQuestionPrompt } from "./askUserAQuestion.prompt";

export function askUserAQuestionTool(): ToolInterface {
  async function handleSearchDirectory(
    userId: string,
    sessionId: string,
    question: string
  ) {
    createMessageWithUser(
      userId,
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

  const name = "ask user";

  return {
    name,
    description: "Asks the user a question and waits for a response",
    use: async (userId, sessionId, question) =>
      await handleSearchDirectory(userId, sessionId, question),
    arguments: ["question"],
    promptTemplate: askUserAQuestionPrompt,
    availableTools: [name],
  };
}
