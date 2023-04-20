import { Database } from "../../../../types/supabase";
import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";

export function searchDirectoryTool(): ToolInterface {
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
    use: async (user, sessionId, query) =>
      await handleSearchDirectory(user, sessionId, query),
    arguments: ["search query"],
  };
}
