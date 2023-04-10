import { createClient, PostgrestError } from "@supabase/supabase-js";
import { ParseCode, SnippetByFileName } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { updateCodeDirectoryById } from "../codeDirectory/codeDirectory.service";
import {
  createEmbeddings,
  summarizeCodeExplaination,
} from "../openAi/openai.service";
import { compareAndUpdateSnippets } from "../supabase/supabase.service";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const handleAndFilesToDb = async (
  directoryId: string,
  files: ParseCode[],
  account: Database["public"]["Tables"]["account"]["Row"]
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

  await updateCodeDirectoryById(directoryId, {
    updated_at: new Date().toISOString(),
    indexed_at: new Date().toISOString(),
  });

  console.log("totalUpdateCount", totalUpdateCount);
  console.log("totalMatchedCount", totalMatchedCount);
  console.log("totalNotFound", totalNotFound);
  return {
    totalUpdateCount,
    totalMatchedCount,
    totalNotFound,
  };
};

export async function findSnippetByFileNameAndAccount(
  fileName: string,
  accountId: string
): Promise<SnippetByFileName[] | null> {
  const { data, error } = await supabase
    .from("code_snippet")
    .select(
      "file_name, id, code_file_id, code_string, code_explaination, start_row, start_column, end_row, end_column"
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
      "id, file_name, code_snippet(id, file_name, code_explaination, parsed_code_type, code_string, account_id)"
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
    const { code_snippet, id } = file;

    if (!file.file_name || !file.id || !code_snippet || !code_snippet.length) {
      continue;
    }
    function truncateString(
      inputString: string,
      maxLength: number = 100
    ): string {
      if (inputString.length > maxLength) {
        return inputString.slice(0, maxLength);
      } else {
        return inputString;
      }
    }

    const combinedExplaination = code_snippet
      //@ts-ignore
      .filter(
        (snippet: { parsed_code_type: string }) =>
          excludedEmbeddingTypes.indexOf(snippet.parsed_code_type) === -1
      )
      //@ts-ignore
      .map((snippet) => truncateString(snippet.code_explaination))
      .join("'''");

    const summary = await summarizeCodeExplaination(combinedExplaination);

    const embedding = await createEmbeddings([summary]);

    if (!summary || !embedding) {
      continue;
    } else {
      const { data, error } = await supabase
        .from("code_file")
        .update({
          file_explaination: summary,
          file_explaination_embedding: embedding,
        })
        .eq("id", id);
      filesUpdated++;
      if (error) {
        console.log(error);
        continue;
      }
      if (!data) {
        continue;
      }
    }
  }
  console.log("Number of files updated:", filesUpdated);
};

export const excludedEmbeddingTypes = [
  "import_statement",
  "comment",
  "ERROR",
  "(",
  ")",
  "[",
  "]",
  "{",
  "}",
  "?",
  ":",
];
