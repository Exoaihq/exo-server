import { Database } from "../../../../types/supabase";
import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";

export function getExisitingCodeTool(): ToolInterface {
  async function handleSearchCode(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    // const searchResult = await handleSearch(user, sessionId);
    const account = await findOrUpdateAccount(user);
    const response = await findCodeByQuery(text, account?.id ? account.id : "");
    return {
      output: response[0].code_string
        ? response[0].code_string
        : "No results found",
      metadata: response,
    };
  }

  return {
    name: "get existing code",
    description:
      "Finds the users code snippet given the code explaination. This is useful for when you want to reuse code you've already written or write tests for existing code.",
    use: async (user, sessionId, text) =>
      await handleSearchCode(user, sessionId, text),
    arguments: ["search query"],
  };
}
