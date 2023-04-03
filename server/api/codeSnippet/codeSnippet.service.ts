import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { createEmbeddings } from "../openAi/openai.service";

const supabase = createClient(supabaseUrl, supabaseKey);

export async function findCodeByQuery(
  query: string,
  accountId: string
): Promise<
  Partial<Database["public"]["Tables"]["code_snippet"]["Row"]>[] | []
> {
  const queryEmbedding = await createEmbeddings([query]);

  const response = await findSnippetByExplainationEmbedding(
    queryEmbedding,
    accountId
  );
  return response;
}

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
