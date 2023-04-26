import { ToolName } from ".";
import { extractPath } from "../../../../utils/fileOperations.service";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { findDirectoryTool } from "./findDirectory.tool";
import { findFileTool } from "./findFile.tool";
import { searchDirectoryPrompt } from "./searchDirectory.prompt";

export function searchDirectoryTool(): ToolInterface {
  async function handleSearchDirectory(
    userId: string,
    sessionId: string,
    query: string
  ) {
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
      metadata: { ...response },
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

  const name = ToolName.searchDirectory;

  return {
    name,
    description:
      "Searches or finds the users directories for the given directory name or query and return up to ten directories. This does not return the contents of the directory. To find files use the 'search files' tool.",
    use: async (userId, sessionId, query) =>
      await handleSearchDirectory(userId, sessionId, query),
    arguments: ["search query"],
    promptTemplate: searchDirectoryPrompt,
    availableTools: [
      name,
      ToolName.findFile,
      ToolName.findDirectory,
      ToolName.finalAnswer,
      ToolName.searchFiles,
    ],
    outputFunction,
  };
}