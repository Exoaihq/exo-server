import { ParseCode } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { isTodaysDate } from "../../../utils/dates";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { updateCodeDirectoryById } from "../codeDirectory/codeDirectory.repository";
import {
  createEmbeddings,
  summarizeCodeExplaination,
} from "../openAi/openai.service";
import { compareAndUpdateSnippets } from "../supabase/supabase.service";
import {
  findAllFiles,
  findFilesWithoutExplaination,
  findSnippetByFileNameAndAccount,
  updateFileById,
} from "./codeFile.repository";

export const handleAndFilesToDb = async (
  files: ParseCode[],
  account: Database["public"]["Tables"]["account"]["Row"],
  directoryId?: number
) => {
  let totalUpdateCount = 0;
  let totalMatchedCount = 0;
  let totalNotFound = 0;

  // TODO - don't index files that are too big

  files.forEach(async (file) => {
    const { filePath, contents } = file;

    const { fileName } = extractFileNameAndPathFromFullPath(filePath);

    // Find all code snippets for this file
    const snippets = await findSnippetByFileNameAndAccount(
      fileName,
      account.id
    );

    const { updateCount, matchedCount, notFound } =
      await compareAndUpdateSnippets(
        { filePath, contents },
        false,
        account.id,
        snippets
      );

    totalUpdateCount += updateCount;
    totalMatchedCount += matchedCount;
    totalNotFound += notFound;
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

export const updateFileExplanation = async () => {
  const files = await findAllFiles();

  if (!files || !files.length) {
    return;
  }

  console.log("files", files.length);
  let filesUpdated = 0;

  for (let i = 0; i < files.length; i++) {
    const { file_name, account_id, id, updated_at } = files[i];

    if (!updated_at) {
      continue;
    }

    const updatedToday = isTodaysDate(new Date(updated_at));
    console.log("updatedToday", updatedToday);
    if (updatedToday) {
      continue;
    }

    if (file_name && account_id) {
      const nameAndSnippets = await findAndFilterFileExplanations(
        file_name,
        account_id
      );

      if (!nameAndSnippets) {
        continue;
      }

      const file_explaination = await summarizeCodeExplaination(
        nameAndSnippets
      );

      if (!file_explaination) {
        continue;
      }

      const file_explaination_embedding = await createEmbeddings([
        file_explaination,
      ]);

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
  }
  return filesUpdated;
};

export const findFilesWithoutExplainationAndAssignExplaination = async () => {
  const files = await findFilesWithoutExplaination();
  let filesUpdated = 0;
  console.log("Number of file without explaination:", files?.length);

  if (!files) {
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    //@ts-ignore
    const { code_snippet, id, file_name, account_id } = file;

    if (
      !file_name ||
      !file.id ||
      !code_snippet ||
      !code_snippet.length ||
      !account_id
    ) {
      continue;
    }

    const combinedExplaination = await findAndFilterFileExplanations(
      file_name,
      account_id
    );

    if (!combinedExplaination) {
      continue;
    }

    const file_explaination = await summarizeCodeExplaination(
      combinedExplaination
    );

    const file_explaination_embedding = await createEmbeddings([
      file_explaination,
    ]);

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
  console.log("Number of files updated:", filesUpdated);
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
