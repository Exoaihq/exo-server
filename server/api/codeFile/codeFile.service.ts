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
import { updateCodeDirectoryById } from "../codeDirectory/codeDirectory.repository";
import {
  createChatCompletion,
  getSummaryOfCode,
  getSummaryOfFile,
} from "../openAi/openai.service";
import {
  createCodeFile,
  findFileByAccountIdAndFullFilePath,
  findFilesWithoutExplaination,
  findSnippetByFileNameAndAccount,
  updateFileById,
} from "./codeFile.repository";
import {
  createEmbeddings,
  getTexCompletionUsingDavinci,
} from "../openAi/openAi.repository";
import { DbFile } from "./codeFile.type";

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
      await createCodeFile(account.id, {
        file_name: fileName,
        file_path: extractedPath,
        code_directory_id: directoryId ? directoryId : null,
        content: contents,
      });
    } else {
      if (!dbFile.updated_at) {
      } else {
        // const updatedInPastHour = isThisHour(new Date(dbFile.updated_at));
        // console.log("File updated in the last hour?", updatedInPastHour);
        // if (updatedInPastHour) {
        //   return;
        // }
      }
    }

    // If the file doesn't have content, update it
    if (!dbFile?.content && dbFile?.id) {
      updateFileById(dbFile?.id, {
        content: contents,
        updated_at: new Date().toISOString(),
      });
      totalUpdateCount++;
    } else if (dbFile?.content !== contents && dbFile?.id) {
      // If the file has content, but it's not an exact match, update it
      updateFileById(dbFile?.id, {
        content: contents,
        updated_at: new Date().toISOString(),
      });
      totalUpdateCount++;
    } else {
      // File is up to date
      totalMatchedCount++;
    }

    logInfo(`File ${dbFile?.file_name} updated`);

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

    if (!file_name || !file.id || !account_id || !content || !file_path) {
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
