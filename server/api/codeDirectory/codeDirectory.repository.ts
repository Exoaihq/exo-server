import { createClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { createEmbeddings } from "../openAi/openai.service";
import { findOrUpdateAccount } from "../supabase/account.service";

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const findAllDirectories = async (): Promise<
  Database["public"]["Tables"]["code_directory"]["Row"][] | null
> => {
  const { data, error } = await supabase.from("code_directory").select("*");

  if (error) {
    console.log("Getting all directories error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data;
  }
};

export const findCodeDirectoryByNameAndUser = async (
  userId: string,
  directoryName: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"] | null> => {
  const account = await findOrUpdateAccount(userId);

  const { data, error } = await supabase
    .from("code_directory")
    .select("*")
    .eq("account_id", account ? account.id : null)
    .eq("directory_name", directoryName);

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data[0];
  }
};

export const findCodeDirectoryByPathAndAccountId = async (
  accountId: string,
  directoryName: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"] | null> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*")
    .eq("account_id", accountId)
    .eq("file_path", directoryName);

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data[0];
  }
};

export const getCodeDirectories = async (
  accountId: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"][] | null> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*, code_file!code_file_code_directory_id_fkey(*)")
    .eq("account_id", accountId)
    .order("indexed_at", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code directory error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data;
  }
};

export const getSavedCodeDirectories = async (): Promise<
  Database["public"]["Tables"]["code_directory"]["Row"][] | null
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*, code_file!code_file_code_directory_id_fkey(*)")
    .eq("saved", true);

  if (error) {
    console.log("Getting saved directory error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    console.log("Save directory count:", data.length);
    return data;
  }
};

export const getDirectoriesByParentId = async (
  parentId: number
): Promise<
  Partial<Database["public"]["Tables"]["code_directory"]["Row"]>[] | null
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select(
      "id, parent_directory_id, directory_name, file_path, saved, account_id, directory_explaination, indexed_at, created_at, updated_at"
    )
    .eq("parent_directory_id", parentId);

  if (error) {
    console.log("Getting saved directory error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    console.log("Get directory by parent id count:", data.length);
    return data;
  }
};

export const getDirectoriesWithoutExplainations = async (): Promise<
  Database["public"]["Tables"]["code_directory"]["Row"][] | null
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*")
    .is("directory_explaination", null);

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    console.log("No directories without explainations");
    return null;
  } else {
    console.log("Directories without explainations", data.length);
    return data;
  }
};

export const getSavedDirectoryWhereAccountIsNotNull = async () => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("id, saved, account_id, file_path, directory_name")
    .eq("saved", true)
    .not("account_id", "is", null)
    .order("account_id", { ascending: true });
  if (error) {
    throw new Error(error.message);
  } else {
    return data;
  }
};

export const updateCodeDirectoryById = async (
  id: number,
  values?: Partial<Database["public"]["Tables"]["code_directory"]["Update"]>
): Promise<
  Partial<
    Database["public"]["Tables"]["code_directory"]["Update"] | PostgrestError
  >
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .update({ ...values })
    .eq("id", id)
    .select();

  if (error || !data) {
    console.log("Error updating code directory", error);
    return error;
  }

  return data[0] as Database["public"]["Tables"]["code_directory"]["Row"];
};

export const getSavedCodeDirectoriesGroupByAccount = async (): Promise<
  Database["public"]["Tables"]["code_directory"]["Row"][] | null
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*, code_file!code_file_code_directory_id_fkey(*)")
    .eq("saved", true)
    .order("account_id", { ascending: true });

  if (error) {
    console.log("Getting saved code directory error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    console.log("Save directory count:", data.length);
    return data;
  }
};

export const createCodeDirectoryByUser = async (
  userId: string,
  filePath: string,
  directoryName: string,
  saved: boolean
): Promise<Database["public"]["Tables"]["code_directory"]["Insert"]> => {
  const account = await findOrUpdateAccount(userId);

  const { data } = await supabase
    .from("code_directory")
    .insert([
      {
        file_path: filePath,
        directory_name: directoryName,
        account_id: account ? account.id : null,
        saved,
      },
    ])
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["code_directory"]["Row"];
};

export const createCodeDirectory = async (
  values: Database["public"]["Tables"]["code_directory"]["Insert"]
): Promise<Database["public"]["Tables"]["code_directory"]["Insert"]> => {
  const { data } = await supabase
    .from("code_directory")
    .insert({ ...values })
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["code_directory"]["Row"];
};

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
