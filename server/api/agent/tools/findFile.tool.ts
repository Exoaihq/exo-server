import { ToolName } from ".";
import { extractPath } from "../../../../utils/fileOperations.service";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { findDirectoryTool } from "./findDirectory.tool";
import { findFilePrompt } from "./findFile.prompt";
import { searchCodeTool } from "./searchCode.tool";
import { searchDirectoryTool } from "./searchDirectory.tool";

export function findFileTool(): ToolInterface {
  async function handleSearchCode(
    userId: string,
    sessionId: string,
    text: string
  ) {
    // const searchResult = await handleSearch(userId, sessionId);
    const account = await findOrUpdateAccount(userId);
    const response = await findCodeByQuery(text, account?.id ? account.id : "");

    console.log("response", response);
    return {
      output: response[0].file_name
        ? `The file name that best matches this search is: ${response[0].file_name} which is located at: ${response[0].relative_file_path}.`
        : "No results found. Try adapting your search query.",
      metadata: response,
    };
  }
  const name = ToolName.findFile;

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

  return {
    name,
    description:
      "Finds the users code file for the given name or query and returns one code file result",
    use: async (userId, sessionId, text) =>
      await handleSearchCode(userId, sessionId, text),
    arguments: ["query"],
    promptTemplate: findFilePrompt,
    availableTools: [
      name,
      ToolName.searchCode,
      ToolName.searchDirectory,
      ToolName.findDirectory,
      ToolName.finalAnswer,
    ],
    outputFunction,
  };
}
