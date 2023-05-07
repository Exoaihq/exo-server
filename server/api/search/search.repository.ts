import { supabase } from "../../../server";
import { Database } from "../../../types/supabase";
import { createEmbeddings } from "../openAi/openAi.repository";

export async function codeDirectorySearch(
  searchQuery: string,
  accountId: string,
  match_count: number = 10
) {
  const embedding = await createEmbeddings([searchQuery]);

  const query = {
    accountid: accountId,
    query_embedding: embedding,
    similarity_threshold: 0.7,
    match_count,
  };

  const { data, error } = await supabase.rpc("match_code_directory", query);

  return data;
}

export async function findFileByExplainationEmbedding(
  searchQuery: string,
  accountId: string
): Promise<Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | []> {
  const embedding = await createEmbeddings([searchQuery]);
  const query = {
    accountid: accountId,
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
