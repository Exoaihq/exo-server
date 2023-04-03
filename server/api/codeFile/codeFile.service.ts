import { createClient } from "@supabase/supabase-js";
import { ParseCode, SnippetByFileName } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import {
  compareAndUpdateSnippets,
  findSnippetByFileName,
} from "../supabase/supabase.service";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const handleAndFilesToDb = async (
  files: ParseCode[],
  account: Database["public"]["Tables"]["account"]["Row"]
) => {
  let totalUpdateCount = 0;
  let totalMatchedCount = 0;
  let totalNotFound = 0;

  // TODO - don't index files that are too big

  console.log(account);

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
