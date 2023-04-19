import { ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { Database } from "../../../types/supabase";
import { createAiWritenCode } from "../aiCreatedCode/aiCreatedCode.service";
import { codeDirectorySearch } from "../codeDirectory/codeDirectory.repository";
import { findFilesByAccountIdAndDirectoryId } from "../codeFile/codeFile.repository";
import {
  createMemoryWithSession,
  getMemoriesById,
} from "../memory/memory.service";

import { createChatCompletion } from "../openAi/openai.service";
import { findCodeByQuery } from "../search/search.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  findOrCreateSession,
  resetSession,
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
    const dbSession = await findOrCreateSession(user, sessionId);
    const { location, code_content } = dbSession;

    await createAiWritenCode({
      session_id: sessionId,
      code: code_content,
      location,
    });

    await resetSession(user, sessionId);

    return {
      output: `I've written the code to the location you specified. I've also cleared the session of the code and location so you can write new code.`,
    };
  }

  return {
    name: "write code",
    description:
      "Writes the given code functionality to the the location specified. Before using this tool you must set the location to write code to and generate the code.",
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
      output: `Here is the code that I generated for you: ${improvedCode}. I've added this code to the session. When you are ready to write this code to the file use the write file tool.`,
    };
  }

  return {
    name: "generate code",
    description:
      "Generates the given code functionality and adds it to the session to be written to the file or scratch pad. Before using this tool you must set the location to write code to.",
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
    name: "set location",
    description:
      "If you know the location to write code to you can set it here. Return either 'scratchPad' or the full file path: '/src/components' for example. Before using this tool you should decide if you should search exising code or write new code.",
    use: async (user, sessionId, text) =>
      handleGetLocation(user, sessionId, text),
  };
}

export function storeMemoryTool(): ToolInterface {
  async function handleStoreMemory(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    text: string
  ) {
    const memory = await createMemoryWithSession(
      {
        memory_text: text,
      },
      sessionId
    );

    return {
      output: `I've set the memory ${text}. To retrieve this memory say 'retrieve memory' with the id of ${memory.id} `,
    };
  }

  return {
    name: "store memory",
    description:
      "Stores memories for longer tasks that require multiple steps to complete.",
    use: async (user, sessionId, memory) =>
      handleStoreMemory(user, sessionId, memory),
  };
}

export function retrieveMemoryTool(): ToolInterface {
  async function handleStoreMemory(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    id: string
  ) {
    const memory = await getMemoriesById(id);

    return {
      output: `Here is the memory you requested: ${
        memory?.memory_text ? memory.memory_text : "No memory found"
      }`,
    };
  }

  return {
    name: "retrieve memory",
    description:
      "Retrieves a stored memory for longer tasks that require multiple steps to complete.",
    use: async (user, sessionId, id) => handleStoreMemory(user, sessionId, id),
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
    name: "search code",
    description:
      "Searches the users code files for the given query and return up to ten results.",
    use: async (user, sessionId, text) =>
      await handleSearchCode(user, sessionId, text),
  };
}

export function findCodeTool(): ToolInterface {
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
    name: "find one code result",
    description:
      "Finds the users code for the given query and returns one result",
    use: async (user, sessionId, text) =>
      await handleSearchCode(user, sessionId, text),
  };
}

export function searchDirectoryTool(): ToolInterface {
  async function handleSearchDirectory(
    user: Database["public"]["Tables"]["users"]["Row"],
    sessionId: string,
    name: string
  ) {
    // const searchResult = await handleSearch(user, sessionId);
    const account = await findOrUpdateAccount(user);
    const response = await codeDirectorySearch(
      name,
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
      "Searches the users code files and directories for the given directory name and return up to ten code files.",
    use: async (user, sessionId, name) =>
      await handleSearchDirectory(user, sessionId, name),
  };
}

export function findDirectoryTool(): ToolInterface {
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

  return {
    name: "find one directory",
    description: "Finds one code file or directory given the query",
    use: async (user, sessionId, query) =>
      await handleSearchDirectory(user, sessionId, query),
  };
}
