import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";

export function findFileTool(): ToolInterface {
  async function handleSearchCode(
    userId: string,
    sessionId: string,
    text: string
  ) {
    // const searchResult = await handleSearch(userId, sessionId);
    const account = await findOrUpdateAccount(userId);
    const response = await findCodeByQuery(text, account?.id ? account.id : "");
    return {
      output: response[0].file_name
        ? `The file name that best matches this search is: ${response[0].file_name} which is located at: ${response[0].relative_file_path}. I've also added the search results to the scratch pad for you to review.`
        : "No results found",
      metadata: response,
    };
  }

  return {
    name: "find one file",
    description:
      "Finds the users code file for the given name or query and returns one code file result",
    use: async (userId, sessionId, text) =>
      await handleSearchCode(userId, sessionId, text),
    arguments: ["search query"],
  };
}
