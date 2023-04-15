import { createClient, PostgrestError } from "@supabase/supabase-js";
import { SnippetByFileName } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function findSnippetByFileNameAndAccount(
  fileName: string,
  accountId: string
): Promise<SnippetByFileName[] | null> {
  const { data, error } = await supabase
    .from("code_snippet")
    .select(
      "file_name, id, code_file_id, code_string, code_explaination, start_row, start_column, end_row, end_column, parsed_code_type, account_id"
    )
    .eq("file_name", fileName)
    .eq("account_id", accountId);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function findFileByAccountId(
  accountId: string
): Promise<Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | null> {
  const { data, error } = await supabase
    .from("code_file")
    .select("id, file_name, account_id, file_path, code_directory_id")
    .eq("account_id", accountId);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function findFilesWithoutExplaination(): Promise<
  Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | null
> {
  const { data, error } = await supabase
    .from("code_file")
    .select(
      "id, file_name, account_id, code_snippet(id, file_name, code_explaination, parsed_code_type, code_string, account_id)"
    )
    .is("file_explaination", null);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function findAllFiles(): Promise<
  Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | null
> {
  const { data, error } = await supabase
    .from("code_file")
    .select("id, file_name, file_explaination, account_id, updated_at")
    .not("account_id", "is", null);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export const updateFileById = async (
  id: number,
  values?: Partial<Database["public"]["Tables"]["code_file"]["Update"]>
): Promise<
  Partial<Database["public"]["Tables"]["code_file"]["Update"] | PostgrestError>
> => {
  const { data, error } = await supabase
    .from("code_file")
    .update({ ...values })
    .eq("id", id)
    .select();

  if (error || !data) {
    console.log("Error updating code directory", error);
    return error;
  }

  return data[0] as Database["public"]["Tables"]["code_file"]["Row"];
};

export const createCodeFile = async (
  accountId: string,
  values: Partial<Database["public"]["Tables"]["code_file"]["Update"]>
): Promise<Database["public"]["Tables"]["code_directory"]["Insert"] | null> => {
  const { data, error } = await supabase
    .from("code_file")
    .insert([{ ...values, account_id: accountId }])
    .select();

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }

  return data[0] as Database["public"]["Tables"]["code_file"]["Row"];
};
