import { Database } from "../../../../types/supabase";
import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";

export function findDirectoryTool(): ToolInterface {
  async function handleSearchDirectory(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    query: string
  ) {
    // const searchResult = await handleSearch(user, sessionId);
    const account = await findOrUpdateAccount(user);
    const response = await codeDirectorySearch(
      query,
      account?.id ? account.id : ""
    );

    let output = "";
    if (response && response.length > 0) {
      output = `The directory name that best matches this search is: ${response[0].directory_name} which is located at: ${response[0].file_path}.`;
    } else {
      output = "No results found";
    }

    return {
      output,
      metadata: response,
    };
  }

  return {
    name: "find one directory",
    description: "Finds one code file or directory given the query",
    use: async (user, sessionId, query) =>
      await handleSearchDirectory(user, sessionId, query),
    arguments: ["search query"],
  };
}
