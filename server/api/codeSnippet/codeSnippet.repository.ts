import { createClient, PostgrestError } from "@supabase/supabase-js";
import { ParsedCode } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { extractFunctionName } from "../../../utils/getMethodName";
import { findFileByAccountIdAndFullFilePath } from "../codeFile/codeFile.repository";
import {
  createEmbeddings,
  createTextCompletion,
} from "../openAi/openai.service";
import { matchImportSnippetWithExport } from "./codeSnippet.service";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const updateSnippetById = async (
  id: number,
  values?: Partial<Database["public"]["Tables"]["code_snippet"]["Update"]>
): Promise<Partial<Database["public"]["Tables"]["code_snippet"]["Update"]>> => {
  const { data, error } = await supabase
    .from("code_snippet")
    .update({ ...values })
    .eq("id", id)
    .select();

  if (error || !data) {
    console.log("Error updating code snippet", error);
    throw new Error(error.message);
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

  const file = await findFileByAccountIdAndFullFilePath(
    accountId,
    snippet.metadata.filePath + "/" + snippet.metadata.fileName
  );

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
    code_file_id: file ? file.id : null,
    account_id: accountId,
    name: matched ? matched : null,
  };

  let updatedOrCreated;
  if (dbSnippetId) {
    const { data, error } = await supabase
      .from("code_snippet")
      .update(dbRecord)
      .eq("id", dbSnippetId)
      .select("*");
    if (data && data[0]) {
      updatedOrCreated = data[0];
    }
  } else {
    const { data, error } = await supabase
      .from("code_snippet")
      .insert([dbRecord])
      .select("*");

    if (data && data[0]) {
      updatedOrCreated = data[0];
    }
  }

  if (
    updatedOrCreated &&
    updatedOrCreated.parsed_code_type === "import_statement"
  ) {
    const { matchedSnippet } = await matchImportSnippetWithExport(
      updatedOrCreated
    );

    if (matchedSnippet) {
      matchedSnippet.forEach(async (snippet) => {
        createImportExportMap({
          import_id: snippet.id,
          export_id: snippet.exportId,
        });
      });
    }
  }
}

export const findAllSnippetsWhereNameIsNull = async () => {
  const { data, error } = await supabase
    .from("code_snippet")
    .select("code_string, id, name, file_name, parsed_code_type")
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

export const findExportSnippetByNameAndPath = async (name: string) => {
  const { data, error } = await supabase
    .from("code_snippet")
    .select(
      "code_string, id, name, file_name, parsed_code_type, relative_file_path, updated_at, account_id"
    )
    .not("name", "is", null)
    .not("account_id", "is", null)
    .in("parsed_code_type", ["export_statement"])
    .not("code_string", "is", null)
    .eq("name", name)
    .neq("file_name", "yarn.lock")
    .order("updated_at", { ascending: true })
    .limit(1);

  if (error) {
    console.log("Error finding snippets", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return data[0];
};

export const findAllSnippetsImportStatements = async () => {
  const { data, error } = await supabase
    .from("code_snippet")
    .select(
      "code_string, id, name, file_name, name, relative_file_path, account_id, parsed_code_type "
    )
    .is("name", null)
    .in("parsed_code_type", ["import_statement"])
    .not("code_string", "is", null)
    .not("file_name", "is", null)
    .neq("file_name", "yarn.lock")
    .not("account_id", "is", null)
    .order("updated_at", { ascending: true })
    .limit(1000);

  if (error) {
    console.log("Error finding import snippets", error);
    return [];
  }

  if (!data) {
    return [];
  }

  return data;
};

export const createImportExportMap = async (value: any) => {
  const found = await supabase
    .from("export_import_snippet_map")
    .select("id, export_id, import_id")
    .eq("export_id", value.export_id)
    .eq("import_id", value.import_id);

  if (found.data && found.data.length > 0) {
    return;
  } else {
    await supabase.from("export_import_snippet_map").insert([value]);
  }
};

export const getLongSnippets = async (minLength: number) => {
  const { data, error } = await supabase
    .rpc("find_long_snippets", {
      line_count: minLength,
    })
    .eq("parsed_code_type", "export_statement")
    .not("code_string", "is", null)
    .not("file_name", "is", null)
    .not("account_id", "is", null)
    .not("code_string", "is", null)
    .select("*, code_file(*)")
    .order("updated_at", { ascending: false });

  if (error) {
    console.log("Error finding long snippets", error);
    return [];
  }

  return data;
};

export const createCodeSnippet = async (
  values: Database["public"]["Tables"]["code_snippet"]["Insert"]
) => {
  const { data, error } = await supabase
    .from("code_snippet")
    .insert([{ ...values }])
    .select("*");
  return data;
};

export async function findExoConfigSnippetByCodeDirectoryId(
  directoryId: number
): Promise<Partial<Database["public"]["Tables"]["code_file"]["Row"]> | null> {
  const { data, error } = await supabase
    .from("code_snippet")
    .select("*")
    .eq("file_name", "exo-config.json")
    .eq("code_directory_id", directoryId)
    .limit(1);

  if (error) {
    return null;
  }
  if (!data) {
    return null;
  }
  return data[0];
}
