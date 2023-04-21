import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { searchDirectoryPrompt } from "./searchDirectory.prompt";

export function searchDirectoryTool(): ToolInterface {
  async function handleSearchDirectory(
    userId: string,
    sessionId: string,
    query: string
  ) {
    // const searchResult = await handleSearch(userId, sessionId);
    const account = await findOrUpdateAccount(userId);
    const response = await codeDirectorySearch(
      query,
      account?.id ? account.id : ""
    );

    let output = "";
    if (response && response.length > 0 && account) {
      if (response && response.length > 0) {
        output = response
          .slice(0, 10)
          .map((r) => `Name: ${r.directory_name}, Path: ${r.file_path}`)
          .join(", ");
      } else {
        output = "No results found";
      }
    } else {
      output = "No results found";
    }

    return {
      output,
      metadata: response,
    };
  }

  return {
    name: "search directory",
    description:
      "Searches the users directories for the given directory name or query and return up to ten directories. This does not return the contents of the directory.",
    use: async (userId, sessionId, query) =>
      await handleSearchDirectory(userId, sessionId, query),
    arguments: ["search query"],
    promptTemplate: searchDirectoryPrompt,
  };
}
