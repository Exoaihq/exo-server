import { Json } from "../../../../types/supabase";
import { findCodeByQuery } from "../../codeSnippet/codeSnippet.service";
import { createMessageWithUser } from "../../message/message.service";
import { findOrUpdateAccount } from "../../supabase/account.service";

export async function handleSearch(
  sessionMessages: any[],
  user: {
    avatar_url: string | null;
    billing_address: Json;
    email: string | null;
    full_name: string | null;
    id: string;
    payment_method: Json;
  },
  sessionId: string
) {
  const userMessages = sessionMessages.filter(
    (message) => message.role === "user"
  );
  console.log("User messages", userMessages[userMessages.length - 1].content);

  const account = await findOrUpdateAccount(user);

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
    user,
    // @ts-ignore
    templateResponse.data.choices[0].message,
    sessionId
  );
  return templateResponse;
}
