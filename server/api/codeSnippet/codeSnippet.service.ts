import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import {
  createCodeFile,
  findFileByAccountIdAndFullFilePath,
} from "../codeFile/codeFile.repository";
import { createEmbeddings } from "../openAi/openai.service";
import {
  assignCodeSnippetToFile,
  findAllSnippetWithoutFiles,
  findFileId,
} from "../supabase/supabase.service";
import { writeFile, writeFileSync } from "fs";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  findAllSnippetsWhereNameIsNull,
  updateSnippetById,
} from "./codeSnippet.repository";
import { extractFunctionName } from "../../../utils/getMethodName";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function codeSnippetSearch(code: string) {
  const code_embedding = await createEmbeddings([code]);

  const query = {
    query_embedding: code_embedding,
    similarity_threshold: 0.8,
    match_count: 10,
  };

  const { data, error } = await supabase.rpc("match_code", query);

  return data;
}

export async function findSnippetByExplainationEmbedding(
  embedding: number[],
  accountId: string,
  match_count: number = 10
) {
  const query = {
    accountid: accountId,
    query_embedding: embedding,
    similarity_threshold: 0.5,
    match_count,
  };

  const { data, error } = await supabase.rpc(
    "match_code_snippet_explaination",
    query
  );

  if (error) {
    console.log(error);
    return [];
  }
  if (!data) {
    return [];
  }
  return data;
}

export async function findSnippetsWithoutFilesAndAssignFiles() {
  const snippets = await findAllSnippetWithoutFiles();

  if (!snippets) {
    return;
  }
  for (let i = 0; i < snippets.length; i++) {
    const snippet = snippets[i];
    if (!snippet.file_name || !snippet.id) {
      continue;
    }
    const fileId = await findFileId(snippet.file_name);
    if (!fileId) {
      // Create file
      if (!snippet.account_id) {
        continue;
      }
      const file = await createCodeFile(
        snippet.account_id ? snippet.account_id : "",
        {
          file_name: snippet.file_name,
          file_path: snippet.relative_file_path,
          updated_at: new Date().toISOString(),
        }
      );
      if (!file || !file.id) {
        continue;
      }
      await assignCodeSnippetToFile(file.id, snippet.id);
    } else {
      await assignCodeSnippetToFile(fileId, snippet.id);
    }
  }
}

export const createNewFileFromSnippets = async (
  fullPath: string,
  userId: string
) => {
  const account = await findOrUpdateAccount(userId);
  const fileWithSnippets = await findFileByAccountIdAndFullFilePath(
    account?.id ? account.id : "",
    fullPath
  );

  if (
    !fileWithSnippets ||
    !fileWithSnippets.file_name ||
    !fileWithSnippets.file_path
  ) {
    return null;
  }

  if (!fileWithSnippets?.code_snippet) {
    // Create the snippets
  } else {
    // Check the snippets
    const { code_snippet } = fileWithSnippets;

    let codeSnippets: any[] = [];

    if (!Array.isArray(code_snippet)) {
      codeSnippets = [code_snippet];
    } else {
      codeSnippets = [...code_snippet];
    }

    const orderByStartRow = codeSnippets.sort((a, b) => {
      return a.start_row - b.start_row;
    });

    const array: any[] = [];

    let previousStopRow = 0;

    for await (const snippet of orderByStartRow) {
      const emptyLinesToAdd = snippet.start_row - previousStopRow - 1;

      if (emptyLinesToAdd > 0) {
        array.splice(previousStopRow + 1, emptyLinesToAdd, "\n");
      }
      array.splice(
        snippet.start_row,
        snippet.end_row - snippet.start_row,
        snippet.code_string
      );
      previousStopRow = snippet.end_row;
    }

    // fs.writeFileSync(testPath, array.join(" "));

    const fileContent = array.join(" ");
    return fileContent;
  }
};

export async function updateCodeSnippetNames() {
  const allSnippetsWhereNameIsNotSet = await findAllSnippetsWhereNameIsNull();

  console.log(allSnippetsWhereNameIsNotSet.length);

  let matchedCount = 0;
  let notMatchedCount = 0;
  let matchedSnippets: {
    id: number;
    name: string | null;
  }[] = [];

  allSnippetsWhereNameIsNotSet.forEach(async (snippet) => {
    if (!snippet.code_string) {
      return;
    }
    const matched = extractFunctionName(snippet.code_string);
    if (!matched) {
      console.log("Not Matched: ", snippet.code_string);
      notMatchedCount++;
      return;
    } else {
      matchedCount++;
      matchedSnippets.push({
        id: snippet.id,
        name: matched,
      });
    }
  });

  matchedSnippets.forEach(async (snippet) => {
    await updateSnippetById(snippet.id, {
      name: snippet.name,
      updated_at: new Date().toISOString(),
    });
  });

  console.log("Matched: ", matchedCount);
  console.log("Not Matched: ", notMatchedCount);
  console.log("Total: ", matchedSnippets);
}
