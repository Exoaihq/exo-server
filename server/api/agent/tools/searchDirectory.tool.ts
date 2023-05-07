import { ToolName } from ".";
import { ChatUserType } from "../../../../types/chatMessage.type";
import { extractPath } from "../../../../utils/fileOperations.service";
import { findAndUpdateAiCodeBySession } from "../../aiCreatedCode/aiCreatedCode.service";
import { createChatCompletion } from "../../openAi/openai.service";
import { codeDirectorySearch } from "../../search/search.repository";

import { findOrUpdateAccount } from "../../supabase/account.service";
import { TaskWithObjective } from "../../task/task.types";
import { ToolInterface } from "../agent.service";
import {
  refinementPrompt,
  searchDirectoryPrompt,
} from "./searchDirectory.prompt";

export function searchDirectoryTool(): ToolInterface {
  async function handleSearchDirectory(
    userId: string,
    sessionId: string,
    query: string,
    task?: Partial<TaskWithObjective>
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
          .map(
            (r: { directory_name: any; file_path: any }) =>
              `Name: ${r.directory_name}, Path: ${r.file_path}`
          )
          .join(", ");

        if (task && task.description) {
          const refinement = await createChatCompletion([
            {
              content: refinementPrompt(task.description, output),
              role: ChatUserType.user,
            },
          ]);

          if (refinement) {
            output = refinement;
          }
        }
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
    use: async (userId, sessionId, query, task) =>
      await handleSearchDirectory(userId, sessionId, query, task),
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
