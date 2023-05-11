import { ChatUserType } from "../../../types/chatMessage.type";
import {
  createMessageWithUser,
  getOnlyRoleAndContentMessagesSession,
} from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import { findFileByExplainationEmbedding } from "./search.repository";

export async function handleSearch(userId: string, sessionId: string) {
  const sessionMessages = await getOnlyRoleAndContentMessagesSession(sessionId);

  if (!userId) throw new Error("User not found");

  const userMessages = sessionMessages.filter(
    (message) => message.role === "user"
  );
  console.log("User messages", userMessages[userMessages.length - 1].content);

  const account = await findOrUpdateAccount(userId);

  const response = await findCodeByQuery(
    userMessages[userMessages.length - 1].content,
    account?.id ? account.id : ""
  );

  const templateResponse = {
    data: {
      choices: [
        {
          message: {
            content:
              "We found these code snippets that might match your search:",
            role: "assistant",
          },
        },
      ],
      metadata: {
        projectDirectory: "",
        projectFile: "",
        newFile: null,
        requiredFunctionality: "",
      },
      completedCode: "",
      search: response,
    },
  };

  await createMessageWithUser(
    {
      content: templateResponse.data.choices[0].message.content,
      role: ChatUserType.assistant,
    },
    sessionId
  );
  return templateResponse;
}

export async function findCodeByQuery(
  query: string,
  accountId: string,
  match_count: number = 10
): Promise<any> {
  const response = await findFileByExplainationEmbedding(
    query,
    accountId,
    match_count
  );
  return response;
}
