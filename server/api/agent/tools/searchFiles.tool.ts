import { ToolName } from ".";
import { extractPath } from "../../../../utils/fileOperations.service";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { codeDirectorySearch } from "../../codeDirectory/codeDirectory.repository";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { findDirectoryTool } from "./findDirectory.tool";
import { findFileTool } from "./findFile.tool";
import { searchDirectoryPrompt } from "./searchDirectory.prompt";

// Need toflesh this out

export function searchFilesTool(): ToolInterface {
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

  const name = ToolName.searchFiles;

  return {
    name,
    description:
      "Searches or finds the users files for the given file name or query and return up to ten files. This does not return the contents of the files. To find the contents of a file use the 'find one file' tool.",
    use: async (userId, sessionId, query) =>
      await handleSearchDirectory(userId, sessionId, query),
    arguments: ["search query"],
    promptTemplate: searchDirectoryPrompt,
    availableTools: [
      name,
      ToolName.findFile,
      ToolName.findDirectory,
      ToolName.finalAnswer,
    ],
    outputFunction,
  };
}
