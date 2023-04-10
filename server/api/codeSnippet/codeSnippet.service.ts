import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { createCodeFile } from "../codeFile/codeFile.service";
import { createEmbeddings } from "../openAi/openai.service";
import {
  assignCodeSnippetToFile,
  findAllSnippetWithoutFiles,
  findFileId,
} from "../supabase/supabase.service";

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

export async function findFileByExplainationEmbedding(
  embedding: number[]
): Promise<
  Partial<Database["public"]["Tables"]["code_snippet"]["Row"]>[] | []
> {
  console.log("find File By Explaination Embedding", embedding);
  const query = {
    query_embedding: embedding,
    similarity_threshold: 0.5,
    match_count: 10,
  };

  const { data, error } = await supabase.rpc("match_code_file", query);

  if (error) {
    console.log(error);
    return [];
  }
  if (!data) {
    return [];
  }
  return data;
}

export async function findSnippetByExplainationEmbedding(
  embedding: number[],
  accountId: string
): Promise<
  Partial<Database["public"]["Tables"]["code_snippet"]["Row"]>[] | []
> {
  const query = {
    accountid: accountId,
    query_embedding: embedding,
    similarity_threshold: 0.5,
    match_count: 10,
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
