import { createClient, PostgrestError } from "@supabase/supabase-js";
import { ParsedCode } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { extractFunctionName } from "../../../utils/getMethodName";
import {
  createEmbeddings,
  createTextCompletion,
} from "../openAi/openai.service";
import { findFileId } from "../supabase/supabase.service";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const updateSnippetById = async (
  id: number,
  values?: Partial<Database["public"]["Tables"]["code_snippet"]["Update"]>
): Promise<
  Partial<
    Database["public"]["Tables"]["code_snippet"]["Update"] | PostgrestError
  >
> => {
  const { data, error } = await supabase
    .from("code_snippet")
    .update({ ...values })
    .eq("id", id)
    .select();

  if (error || !data) {
    console.log("Error updating code snippet", error);
    return error;
  }

  return data[0] as Database["public"]["Tables"]["code_snippet"]["Row"];
};

export const deleteSnippetById = async (id: number) => {
  const { data, error } = await supabase
    .from("code_snippet")
    .delete()
    .eq("id", id)
    .select();

  if (error || !data) {
    console.log("Error deleting code snippet", error);
    return error;
  }

  return data[0] as Database["public"]["Tables"]["code_snippet"]["Row"];
};

export async function addCodeToSupabase(
  snippet: ParsedCode,
  accountId: string,
  dbSnippetId?: number
) {
  const codeExplaination = await createTextCompletion(
    "What does this code do:" + snippet.code
  );

  const code_embedding = await createEmbeddings([snippet.code]);

  let code_explaination = null;
  let code_explaination_embedding = null;

  if (
    codeExplaination &&
    codeExplaination.choices &&
    codeExplaination.choices[0] &&
    codeExplaination.choices[0].text
  ) {
    const { choices } = codeExplaination;
    if (!choices[0].text) {
      return;
    }
    code_explaination = choices[0].text.trim();
    const e = await createEmbeddings([code_explaination]);
    code_explaination_embedding = e[0];
  }

  code_explaination_embedding = await createEmbeddings([code_explaination]);

  const fileId = await findFileId(snippet.metadata.fileName);

  const matched = extractFunctionName(snippet.code);

  const dbRecord = {
    code_string: snippet.code,
    code_explaination,
    code_explaination_embedding,
    code_embedding,
    relative_file_path: snippet.metadata.filePath,
    parsed_code_type: snippet.metadata.type,
    start_row: snippet.metadata.element.startPosition.row,
    start_column: snippet.metadata.element.startPosition.column,
    end_row: snippet.metadata.element.endPosition.row,
    end_column: snippet.metadata.element.endPosition.column,
    file_name: snippet.metadata.fileName,
    code_file_id: fileId,
    account_id: accountId,
    name: matched ? matched : null,
  };

  if (dbSnippetId) {
    await supabase.from("code_snippet").update(dbRecord).eq("id", dbSnippetId);
  } else {
    await supabase.from("code_snippet").insert([dbRecord]);
  }
}

export const findAllSnippetsWhereNameIsNull = async () => {
  const { data, error } = await supabase
    .from("code_snippet")
    .select("code_string, id, name, file_name")
    .is("name", null)
    .in("parsed_code_type", [
      "expression_statement",
      "export_statement",
      "lexical_declaration",
    ])
    .not("code_string", "is", null)
    .not("file_name", "is", null)
    .neq("file_name", "yarn.lock")
    .order("updated_at", { ascending: true })
    .limit(1000);

  if (error) {
    console.log("Error finding snippets", error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data;
};
