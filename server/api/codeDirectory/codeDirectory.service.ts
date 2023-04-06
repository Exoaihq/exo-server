import { createClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { findOrUpdateAccount } from "../supabase/account.service";

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const createDirectoryIfNotExists = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  filePath: string,
  directoryName: string,
  saved: boolean
) => {
  const found = await findCodeDirectoryByNameAndUser(user, directoryName);
  if (!found) {
    await createCodeDirectory(user, filePath, directoryName, saved);
  }
};

export const createCodeDirectory = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  filePath: string,
  directoryName: string,
  saved: boolean
): Promise<Database["public"]["Tables"]["code_directory"]["Insert"]> => {
  const account = await findOrUpdateAccount(user);

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

export const findCodeDirectoryByNameAndUser = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  directoryName: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"] | null> => {
  const account = await findOrUpdateAccount(user);

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

export const getCodeDirectories = async (
  accountId: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"][] | null> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*")
    .eq("account_id", accountId)
    .order("indexed_at", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data;
  }
};

export const updateCodeDirectory = async (
  id: string,
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
