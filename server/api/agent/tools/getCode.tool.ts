import { ToolName } from ".";
import { findCodeByQuery } from "../../search/search.service";
import { findOrUpdateAccount } from "../../supabase/account.service";
import { ToolInterface } from "../agent.service";
import { getCodePrompt } from "./getCode.prompt";

export function getExisitingCodeTool(): ToolInterface {
  async function handleSearchCode(
    userId: string,
    sessionId: string,
    text: string
  ) {
    // const searchResult = await handleSearch(userId, sessionId);
    const account = await findOrUpdateAccount(userId);
    const response = await findCodeByQuery(text, account?.id ? account.id : "");
    return {
      output: response[0].code_string
        ? response[0].code_string
        : "No results found",
      metadata: response,
    };
  }

  const name = ToolName.getExisitingCode;

  return {
    name,
    description:
      "Finds the users code snippet given the code explaination. This is useful for when you want to reuse code you've already written or write tests for existing code.",
    use: async (userId, sessionId, text) =>
      await handleSearchCode(userId, sessionId, text),
    arguments: ["search query"],
    promptTemplate: getCodePrompt(name),
    availableTools: [name],
  };
}
