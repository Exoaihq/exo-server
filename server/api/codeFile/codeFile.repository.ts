import { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../server";
import { SnippetByFileName } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { logError } from "../../../utils/commandLineColors";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { getParsedSnippetFromCodeBlock } from "../../../utils/treeSitter";
import { createAiWritenCode } from "../aiCreatedCode/aiCreatedCode.repository";
import { findCodeDirectoryById } from "../codeDirectory/codeDirectory.repository";
import { getCodeStandards } from "../codeDirectory/codeDirectory.service";
import { createCodeSnippet } from "../codeSnippet/codeSnippet.repository";
import { FileWithSnippets } from "./codeFile.type";

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

export async function findFileByFileNameAndAccount(
  fileName: string,
  accountId: string
): Promise<FileWithSnippets | null> {
  console.log(fileName, accountId);
  const { data, error } = await supabase
    .from("code_file")
    .select("*, code_snippet(*)")
    .eq("file_name", fileName)
    .eq("account_id", accountId)
    .limit(1);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data[0] as FileWithSnippets;
}

export async function findFilesByAccountId(
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

export async function findFileById(
  fileId: number
): Promise<Partial<Database["public"]["Tables"]["code_file"]["Row"]> | null> {
  const { data, error } = await supabase
    .from("code_file")
    .select("*, code_snippet(*)")
    .eq("id", fileId)
    .limit(1);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data[0];
}

export async function findFileByAccountIdAndFullFilePath(
  accountId: string,
  fullFilePath: string
): Promise<FileWithSnippets | null> {
  const { fileName, extractedPath } =
    extractFileNameAndPathFromFullPath(fullFilePath);
  const { data, error } = await supabase
    .from("code_file")
    .select(
      "id, file_name, account_id, file_path, content, code_directory_id, updated_at, code_snippet(id, code_string, code_explaination, start_row, start_column, end_row, end_column, parsed_code_type)"
    )
    .eq("account_id", accountId)
    .eq("file_name", fileName)
    .eq("file_path", extractedPath);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data[0] as FileWithSnippets;
}

export async function findFilesByAccountIdAndDirectoryId(
  accountId: string,
  directoryId: number
): Promise<Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | null> {
  const { data, error } = await supabase
    .from("code_file")
    .select(
      "id, file_name, account_id, file_path, code_directory_id, code_directory_parent_id, file_explaination"
    )
    .eq("account_id", accountId)
    .or(
      `code_directory_id.eq.${directoryId}, code_directory_parent_id.eq.${directoryId}`
    );

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function findFilesByDirectoryId(
  directoryId: number
): Promise<Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | null> {
  const { data, error } = await supabase
    .from("code_file")
    .select(
      "id, file_name, account_id, file_path, code_directory_id, code_directory_parent_id, file_explaination"
    )
    .eq("code_directory_id", directoryId);

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
  FileWithSnippets[] | null
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
  return data as FileWithSnippets[];
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

export async function findAllFilesWhereParentIsNull(): Promise<
  Partial<Database["public"]["Tables"]["code_file"]["Row"]>[] | null
> {
  const { data, error } = await supabase
    .from("code_file")
    .select(
      "id, file_name, file_path, file_explaination, account_id, updated_at, code_directory_id, code_directory_parent_id"
    )
    .not("account_id", "is", null)
    .is("code_directory_parent_id", null);

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

export async function findTestFile(
  filePrefix: string,
  accountId: string
): Promise<Partial<
  Database["public"]["Tables"]["code_snippet"]["Row"]
> | null> {
  const like = `${filePrefix}%.%test%`;

  const { data, error } = await supabase
    .from("code_file")
    .select()
    .like("file_name", like)
    .eq("account_id", accountId)
    .limit(1);

  if (error) {
    return null;
  }
  if (!data) {
    return null;
  }
  return data[0];
}

export async function findExoConfigFileByCodeDirectoryId(
  directoryId: number
): Promise<Database["public"]["Tables"]["code_file"]["Row"] | null> {
  const { data, error } = await supabase
    .from("code_file")
    .select("*, code_snippet(id, file_name, parsed_code_type, code_string)")
    .eq("file_name", "exo-config.json")
    .eq("code_directory_id", directoryId)
    .limit(1);

  if (error) {
    logError(error.message);
    return null;
  }
  if (!data) {
    return null;
  }
  return data[0];
}

export async function createExoConfig(
  directoryId: number
): Promise<Database["public"]["Tables"]["code_file"]["Row"]> {
  const directory = await findCodeDirectoryById(directoryId);

  const file_name = "exo-config.json";

  if (!directory) {
    throw new Error("Could not find directory");
  }
  const values = {
    file_name,
    file_path: directory.file_path,
    file_explaination:
      "This is the Exo config file. This is a JSON file that is used to help Exo understand some of the details of the repo.",
    code_directory_id: directoryId,
    code_directory_parent_id: directoryId,
    account_id: directory.account_id,
  };

  const { data, error } = await supabase
    .from("code_file")
    .insert([{ ...values }])
    .select();

  if (error) {
    console.log(error);
    throw error;
  }
  if (!data) {
    throw new Error("No data returned from supabase");
  }

  const codeStandards = await getCodeStandards(directoryId);

  const templateExoConfig = {
    directoryName: directory.directory_name,
    explanation: directory.directory_explaination,
    codeStandards,
    testFrameworks: [],
  };
  const jsonString = JSON.stringify(templateExoConfig, null, 2);

  const parsedConfig = await getParsedSnippetFromCodeBlock(jsonString);
  const { code, metadata } = parsedConfig;
  const { element } = metadata;

  const snippetValues = {
    file_name,
    parsed_code_type: "expression_statement",
    relative_file_path: directory.file_path,
    code_string: jsonString,
    account_id: directory.account_id,
    code_file_id: data[0].id,
    code_explaination:
      "This is the Exo config snippet. This is a JSON snippet that is used to help Exo understand some of the details of the repo.",
    name: "exo-config",
    start_row: element.startPosition.row,
    start_column: element.startPosition.column,
    end_row: element.endPosition.row,
    end_column: element.endPosition.column,
  };

  await createCodeSnippet(snippetValues);
  await createAiWritenCode({
    account_id: directory.account_id,
    code,
    file_name,
    location: "newFile",
    completed_at: new Date().toISOString(),
    path: directory.file_path,
  });

  return data[0] as Database["public"]["Tables"]["code_file"]["Row"];
}
