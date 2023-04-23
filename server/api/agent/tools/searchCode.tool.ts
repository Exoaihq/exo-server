import { ToolName } from ".";
import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { searchCodePrompt } from "./searchCode.prompt";
import { searchDirectoryTool } from "./searchDirectory.tool";

export function searchCodeTool(): ToolInterface {
  async function handleSearchCode(
    userId: string,
    sessionId: string,
    text: string
  ) {
    // const searchResult = await handleSearch(userId, sessionId);
    const account = await findOrUpdateAccount(userId);
    const response = await findCodeByQuery(text, account?.id ? account.id : "");
    return {
      output: response
        .slice(0, 10)
        .map(
          (r: { file_name: any; relative_file_path: any }) =>
            `Name: ${r.file_name}, Path: ${r.relative_file_path}`
        )
        .join(", "),
    };
  }

  const name = ToolName.searchCode;

  return {
    name,
    description:
      "Searches or finds the users code for the given query and return up to ten results for code locations.",
    use: async (userId, sessionId, text) =>
      await handleSearchCode(userId, sessionId, text),
    arguments: ["search query"],
    promptTemplate: searchCodePrompt(name),
    availableTools: [name, "search directory"],
  };
}
