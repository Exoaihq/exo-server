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
import { isThisHour, isTodaysDate } from "../../../utils/dates";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { updateCodeDirectoryById } from "../codeDirectory/codeDirectory.repository";
import {
  createChatCompletion,
  createEmbeddings,
  createTextCompletion,
  getCompletion,
  getSummaryOfCode,
  getSummaryOfFile,
} from "../openAi/openai.service";
import { compareAndUpdateSnippets } from "../supabase/supabase.service";
import {
  createCodeFile,
  findAllFiles,
  findFileByAccountIdAndFullFilePath,
  findFilesWithoutExplaination,
  findSnippetByFileNameAndAccount,
  updateFileById,
} from "./codeFile.repository";

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
  const test = response?.choices[0].message?.content
    ? response?.choices[0].message?.content
    : null;
  return test;
};

export async function summarizeCodeExplaination(
  text: string,
  model?: string
): Promise<any> {
  const interval = commandLineLoading("Summarizing code");
  try {
    const remainingRequests = await limiter.removeTokens(1);
    const response = await getCompletion(
      `Summarize this explanation of code into a paragraph: ${text}`,
      0.2
    );
    const res = response.data.choices[0].text;
    clearLoading(interval, `Summarizing code query completed`);
    return res;
  } catch (error: any) {
    clearLoading(interval, `Summarizing code query failed`);
    console.log(error);
  }
}
