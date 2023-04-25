import { ToolName } from ".";
import { extractPath } from "../../../../utils/fileOperations.service";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { findDirectoryPrompt } from "./findDirectory.prompt";

export function findDirectoryTool(): ToolInterface {
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

  function outputFunction(output: string, sessionId: string) {
    findAndUpdateAiCodeBySession(
      sessionId,
      {
        location: output,
        path: extractPath(output),
      },
      "location"
    );

    return output;
  }

  const name = ToolName.findDirectory;

  return {
    name,
    description: "Finds one code file or directory given the query",
    use: async (userId, sessionId, query) =>
      await handleSearchDirectory(userId, sessionId, query),
    arguments: ["search query"],
    promptTemplate: findDirectoryPrompt,
    availableTools: [name, ToolName.searchCode, ToolName.searchDirectory],
    outputFunction,
  };
}
