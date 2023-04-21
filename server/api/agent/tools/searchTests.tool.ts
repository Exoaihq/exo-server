import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";

export function searchTestsTool(): ToolInterface {
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

  return {
    name: "search for tests",
    description:
      "Searches for test files in a given directory. Returns all the test files in the directory and subdirectories.",
    use: async (userId, sessionId, text) =>
      await handleSearchCode(userId, sessionId, text),
    arguments: ["directory path"],
  };
}
