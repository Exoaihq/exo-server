import { RateLimiter } from "limiter";
import { ChatUserType } from "../../../types/chatMessage.type";
import { EngineName } from "../../../types/openAiTypes/openAiEngine";
import { ParseCode } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { logInfo } from "../../../utils/commandLineColors";
import {
  clearLoading,
  commandLineLoading,
} from "../../../utils/commandLineLoadingl";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import {
  findCodeDirectoryByPathAndAccountId,
  updateCodeDirectoryById,
} from "../codeDirectory/codeDirectory.repository";
import {
  createChatCompletion,
  getSummaryOfCode,
  getSummaryOfFile,
} from "../openAi/openai.service";
import {
  createCodeFile,
  findFileByAccountIdAndFullFilePath,
  findFilesWithoutDependencies,
  findFilesWithoutExplaination,
  findSnippetByFileNameAndAccount,
  updateFileById,
} from "./codeFile.repository";
import {
  createEmbeddings,
  getTexCompletionUsingDavinci,
} from "../openAi/openAi.repository";
import { DbFile, FileWithSnippets } from "./codeFile.type";
import { isThisHour } from "../../../utils/dates";
import {
  createTestAndUpdateAiCodeAndSession,
  generateTestCodeTool,
} from "../agent/tools/generateTestCode.tool";
import { createMessageWithUser } from "../message/message.service";
import {
  generateCodeSystemPrompt,
  generateDTsFileUserPrompt,
} from "../agent/agent.prompt";

const limiter = new RateLimiter({ tokensPerInterval: 15, interval: "minute" });

const fs = require("fs");

export const handleAndFilesToDb = async (
  files: ParseCode[],
  account: Database["public"]["Tables"]["account"]["Row"],
  directoryId?: number
) => {
  let totalUpdateCount = 0;
  let totalMatchedCount = 0;
  let totalNotFound = 0;

  files.forEach(async (file) => {
    const { filePath, contents } = file;

    const { fileName, extractedPath } =
      extractFileNameAndPathFromFullPath(filePath);

    const dbFile = await findFileByAccountIdAndFullFilePath(
      account.id,
      filePath
    );

    if (!dbFile) {
      // Create new file
      const newFile = await createCodeFile(account.id, {
        file_name: fileName,
        file_path: extractedPath,
        code_directory_id: directoryId ? directoryId : null,
        content: contents,
      });
      logInfo(`File ${newFile?.file_name} created`);
    } else {
      if (!dbFile.updated_at) {
      } else {
        const updatedInPastHour = isThisHour(new Date(dbFile.updated_at));
        console.log("File updated in the last hour", updatedInPastHour);
        if (updatedInPastHour) {
          return;
        }
      }
    }

    // If the file doesn't have content, update it
    if (dbFile && !dbFile.content && dbFile.id) {
      updateFileById(dbFile.id, {
        content: contents,
        code_directory_id: directoryId ? directoryId : null,
        updated_at: new Date().toISOString(),
      });
      logInfo(`File ${dbFile.file_name} content added`);
      totalUpdateCount++;
    } else if (dbFile && dbFile.content !== contents && dbFile.id) {
      // If the file has content, but it's not an exact match, update it
      updateFileById(dbFile.id, {
        content: contents,
        code_directory_id: directoryId ? directoryId : null,
        updated_at: new Date().toISOString(),
      });
      logInfo(`File ${dbFile.file_name} content updated`);
      totalUpdateCount++;
    } else {
      // File is up to date
      totalMatchedCount++;
    }

    // Move this to a cron job
    // // Find all code snippets for this file
    // const snippets = await findSnippetByFileNameAndAccount(
    //   fileName,
    //   account.id
    // );

    // const { updateCount, matchedCount, notFound } =
    //   await compareAndUpdateSnippets(
    //     { filePath, contents },
    //     account.id,
    //     snippets
    //   );

    // if (dbFile) {
    //   await updateFileById(dbFile.id, {
    //     updated_at: new Date().toISOString(),
    //   });
    // }

    // totalUpdateCount += updateCount;
    // totalMatchedCount += matchedCount;
    // totalNotFound += notFound;
  });

  if (directoryId) {
    await updateCodeDirectoryById(directoryId, {
      updated_at: new Date().toISOString(),
      indexed_at: new Date().toISOString(),
    });
  }

  console.log("totalUpdateCount", totalUpdateCount);
  console.log("totalMatchedCount", totalMatchedCount);
  console.log("totalNotFound", totalNotFound);
  return {
    totalUpdateCount,
    totalMatchedCount,
    totalNotFound,
  };
};

export const findFilesWithoutExplainationAndAssignExplaination = async () => {
  const files = await findFilesWithoutExplaination();
  let filesUpdated = 0;
  logInfo(`Number of files without explaination: ${files?.length}`);

  if (!files) {
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    const { id, file_name, account_id, content, file_path } = file;

    if (!file_name || !id || !account_id || !content || !file_path) {
      continue;
    }

    const combinedExplaination = await findAndFilterFileExplanations(
      file_name,
      account_id
    );

    let file_explaination = null;
    let file_explaination_embedding = null;

    if (!combinedExplaination && content) {
      const codeSummary = await getSummaryOfCode(content);

      if (!codeSummary) {
        continue;
      }

      file_explaination = await getSummaryOfFile(
        codeSummary,
        file_name,
        file_path
      );

      if (!file_explaination) {
        continue;
      }

      file_explaination_embedding = await createEmbeddings([file_explaination]);
    } else if (combinedExplaination) {
      file_explaination = await summarizeCodeExplaination(combinedExplaination);

      if (!file_explaination) {
        continue;
      }
      file_explaination_embedding = await createEmbeddings([file_explaination]);
    } else {
      continue;
    }

    if (!file_explaination || !file_explaination_embedding || !id) {
      continue;
    } else {
      await updateFileById(id, {
        file_explaination,
        file_explaination_embedding,
        updated_at: new Date().toISOString(),
      });
      filesUpdated++;
    }
  }
  logInfo(`Number of files updated: ${filesUpdated}`);
};

export const excludedEmbeddingTypes = [
  "import_statement",
  "comment",
  "ERROR",
  "empty_statement",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "?",
  ":",
];

export const findAndFilterFileExplanations = async (
  file_name: string,
  account_id: string
) => {
  const snippets = await findSnippetByFileNameAndAccount(file_name, account_id);
  if (!snippets || !snippets.length) {
    return;
  }
  const snippetExplaintions = snippets
    .filter((snippet) => {
      if (!snippet.parsed_code_type) {
        return false;
      }

      const found = excludedEmbeddingTypes.indexOf(snippet.parsed_code_type);

      return found === -1;
    })
    .map((snippet: { code_explaination: any }, index) => {
      return `${index + 1}) ${snippet.code_explaination}\n`;
    })
    .join(" ");

  const nameAndSnippets = `The name of this file is ${file_name} and the code snippets are ${snippetExplaintions}}`;
  return nameAndSnippets;
};

let ran = false;

export const createTestBasedOnExistingCode = async (code: string) => {
  const functionality = `Write a test for the following code: ${code}`;
  const response = await createChatCompletion(
    [
      {
        role: ChatUserType.user,
        content: functionality,
      },
    ],
    EngineName.GPT4
  );
  const test = response ? response : null;
  return test;
};

export async function summarizeCodeExplaination(
  text: string,
  model?: string
): Promise<any> {
  const interval = commandLineLoading("Summarizing code");
  try {
    const remainingRequests = await limiter.removeTokens(1);
    const response = await getTexCompletionUsingDavinci(
      `Summarize this explanation of code into a paragraph: ${text}`,
      0.2
    );

    clearLoading(interval, `Summarizing code query completed`);
    return response;
  } catch (error: any) {
    clearLoading(interval, `Summarizing code query failed`);
    console.log(error);
  }
}

export function findDeletedFiles(
  filesInRepo: ParseCode[],
  filesInDb: DbFile[]
) {
  if (!filesInDb || !filesInRepo) {
    logInfo(`Deleted Files 0`);
    return [];
  }
  const deletedFiles = filesInDb.filter((file) => {
    const found = filesInRepo.find((repoFile) => {
      return repoFile.filePath === file.file_path + "/" + file.file_name;
    });
    return !found;
  });

  logInfo(`Deleted Files ${deletedFiles.length}`);

  return deletedFiles;
}

export function findDuplicateFiles(filesInDb: DbFile[]): {
  duplicateCount: number;
  duplicateFilePairs:
    | { file1: DbFile; file2: DbFile; oldestFile: DbFile }[]
    | [];
} {
  if (!filesInDb) {
    logInfo(`Duplicate Files 0`);
    return {
      duplicateCount: 0,
      duplicateFilePairs: [],
    };
  }

  const duplicateFilePairs = [] as {
    file1: DbFile;
    file2: DbFile;
    oldestFile: DbFile;
  }[];

  const duplicateFiles = filesInDb.filter((file, index) => {
    const found = filesInDb.find((repoFile) => {
      return (
        repoFile.file_name === file.file_name &&
        repoFile.file_path === file.file_path
      );
    });
    if (!found) {
      return false;
    }
    const findIndex = filesInDb.map((j) => j.id).indexOf(found.id);

    const foundAnother = index !== findIndex;

    if (foundAnother) {
      //@ts-ignore
      const oldestFile = findOldestFile(file, found);

      duplicateFilePairs.push({ file1: file, file2: found, oldestFile });
    }

    return found && index !== findIndex;
  });

  logInfo(`Duplicate Files ${duplicateFiles.length}`);
  return {
    duplicateCount: duplicateFiles.length,
    duplicateFilePairs,
  };
}

export function findOldestFile(
  dbFile: {
    updated_at: string;
  },
  comparisonFile: {
    updated_at: string;
  }
): DbFile {
  const dbFileDate = new Date(dbFile.updated_at);
  const comparisonFileDate = new Date(comparisonFile.updated_at);
  if (dbFileDate < comparisonFileDate) {
    return dbFile as DbFile;
  } else {
    return comparisonFile as DbFile;
  }
}

export async function writeTestsForFiles(
  files: ParseCode[],
  directoryPath: string,
  accountId: string,
  userId: string,
  sessionId: string
) {
  await createMessageWithUser(
    {
      content: `Creating tests for ${files.length} files. This may take a few minutes.`,
      role: ChatUserType.assistant,
    },
    sessionId
  );
  const directory = await findCodeDirectoryByPathAndAccountId(
    accountId,
    directoryPath
  );

  for (const file of files) {
    const { contents, filePath } = file;
    const { extractedPath, fileName } = extractFileNameAndPathFromFullPath(
      file.filePath
    );
    let dbFile: DbFile | FileWithSnippets | null =
      await findFileByAccountIdAndFullFilePath(accountId, filePath);

    if (!dbFile) {
      dbFile = await createCodeFile(accountId, {
        file_name: fileName,
        file_path: extractedPath,
        code_directory_id: directory?.id ? directory.id : null,
        account_id: accountId,
        content: contents,
      });
    }

    // This will create the test and create the ai generated code. The ai generated code will be used to create the test file that will be created by the users Exo app
    await createTestAndUpdateAiCodeAndSession(contents, userId, sessionId, {
      file_name: fileName,
      file_path: extractedPath,
    });
  }
}

export async function findAndAddDependenciesPerFile() {
  console.log("Running find/update dependencies per file");

  const filesWithoutDependencies = await findFilesWithoutDependencies();

  if (!filesWithoutDependencies) {
    logInfo(`Files without dependencies 0`);
    return;
  }

  logInfo(
    `Files without dependencies ${
      filesWithoutDependencies.length ? filesWithoutDependencies.length : 0
    }`
  );

  let updateCount = 0;

  for (const file of filesWithoutDependencies) {
    logInfo(`file length ${file.content.length}`);
    if (file.content.length > 13000) {
      // TODO - add logic to split up files that are too large
      continue;
    }
    const dependencies = await createDependenciesWithAi(file.content);

    if (!dependencies) {
      continue;
    } else {
      await updateFileById(file.id, {
        dependencies,
      });
      updateCount++;
    }
  }
  logInfo(`Files updated with dependencies ${updateCount}`);
}

export async function createDependenciesWithAi(code: string) {
  return await createChatCompletion(
    [
      {
        content: generateCodeSystemPrompt,
        role: ChatUserType.system,
      },
      {
        content: code + generateDTsFileUserPrompt,
        role: ChatUserType.user,
      },
    ],
    EngineName.GPT4,
    0.2,
    4000
  );
}
