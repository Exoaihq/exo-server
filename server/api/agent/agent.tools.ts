import { ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../types/supabase";
import { handleSearch } from "../codeCompletion/scenerios/codeCompletion.search";
import { findCodeByQuery } from "../codeSnippet/codeSnippet.service";
import { createChatCompletion } from "../openAi/openai.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  findOrCreateSession,
  updateSession,
} from "../supabase/supabase.service";
import { ToolInterface } from "./agent.service";

// session holds location, file name and file path
// Once the file name and file path (or scatchpad) are known and the functionality is known you can write to the ai generated code table

export function writeCompletedCodeTool(): ToolInterface {
  async function handleWriteCode(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    await updateSession(user, sessionId, {
      code_content: text,
    });

    return {
      output: `I've written the code to the session for you.`,
    };
  }

  return {
    name: "write code",
    description: "Writes the given code functionality to the session",
    use: async (user, sessionId, text) =>
      await handleWriteCode(user, sessionId, text),
  };
}

export function generateCodeTool(): ToolInterface {
  async function handleWriteCode(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    const response = await createChatCompletion(
      [
        {
          role: ChatUserType.user,
          content: `Improve the following code: ${text}`,
        },
      ],
      EngineName.GPT4
    );

    const improvedCode = response?.choices[0].message?.content
      ? response?.choices[0].message?.content
      : text;

    await updateSession(user, sessionId, {
      code_content: text,
    });

    return {
      output: `Here is the code that I generated for you: ${improvedCode}`,
    };
  }

  return {
    name: "generate code",
    description: "Generates the given code functionality",
    use: async (user, sessionId, text) =>
      await handleWriteCode(user, sessionId, text),
  };
}

export function setLocationToWriteCodeTool(): ToolInterface {
  async function handleGetLocation(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    const dbSession = await findOrCreateSession(user, sessionId);

    await updateSession(user, sessionId, {
      location: text,
    });

    return {
      output: `I've set the location to write code to ${text}`,
    };
  }

  return {
    name: "set write code location",
    description:
      "If you know the location to write code to you can set it here. Return either 'scratchPad' or 'newFile' or 'existingFile'",
    use: async (user, sessionId, text) =>
      handleGetLocation(user, sessionId, text),
  };
}

export function searchCodeTool(): ToolInterface {
  async function handleSearchCode(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    // const searchResult = await handleSearch(user, sessionId);
    const account = await findOrUpdateAccount(user);
    const response = await findCodeByQuery(text, account?.id ? account.id : "");
    return {
      output: response[0].file_name
        ? `The file name that best matches this search is: ${response[0].file_name} which is located at: ${response[0].relative_file_path}. I've also added the search results to the scratch pad for you to review.`
        : "No results found",
      metadata: response,
    };
  }

  return {
    name: "search code",
    description: "Searches the users code files for the given query",
    use: async (user, sessionId, text) =>
      await handleSearchCode(user, sessionId, text),
  };
}
