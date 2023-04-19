import { Database } from "../../../types/supabase";
import { codeDirectorySearch } from "../codeDirectory/codeDirectory.repository";
import { findSnippetByExplainationEmbedding } from "../codeSnippet/codeSnippet.service";
import {
  createMessageWithUser,
  getOnlyRoleAndContentMessagesSession,
} from "../message/message.service";
import { createEmbeddings } from "../openAi/openai.service";
import { findOrUpdateAccount } from "../supabase/account.service";

export async function handleSearch(
  user: Database["public"]["Tables"]["users"]["Row"],
  sessionId: string
) {
  const sessionMessages = await getOnlyRoleAndContentMessagesSession(sessionId);

  if (!user) throw new Error("User not found");

  const userMessages = sessionMessages.filter(
    (message) => message.role === "user"
  );
  console.log("User messages", userMessages[userMessages.length - 1].content);

  const account = await findOrUpdateAccount(user);

  // const response = await findCodeByQuery(
  //   userMessages[userMessages.length - 1].content,
  //   account?.id ? account.id : ""
  // );

  const response = await codeDirectorySearch(
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
    user,
    // @ts-ignore
    templateResponse.data.choices[0].message,
    sessionId
  );
  return templateResponse;
}

export async function findCodeByQuery(
  query: string,
  accountId: string,
  match_count: number = 10
): Promise<any> {
  const queryEmbedding = await createEmbeddings([query]);

  const response = await findSnippetByExplainationEmbedding(
    queryEmbedding,
    accountId,
    match_count
  );
  return response;
}
