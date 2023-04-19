import { Database } from "../../../../types/supabase";
import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findFilesByAccountIdAndDirectoryId } from "../../codeFile/codeFile.repository";
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
      const files = await findFilesByAccountIdAndDirectoryId(
        account?.id,
        response[0].id
      );
      if (files && files.length > 0) {
        output = files
          .slice(0, 10)
          .map((r) => `Name: ${r.file_name}, Path: ${r.file_path}`)
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
      "Searches the users code files and directories for the given directory name and return up to ten directories.",
    use: async (user, sessionId, query) =>
      await handleSearchDirectory(user, sessionId, query),
    arguments: ["search query"],
  };
}
