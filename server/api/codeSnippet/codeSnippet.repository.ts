import { supabase } from "../../../server";
import { ParsedCode } from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { extractFunctionName } from "../../../utils/getMethodName";
import { findFileByAccountIdAndFullFilePath } from "../codeFile/codeFile.repository";
import {
  createEmbeddings,
  createTextCompletion,
  getSummaryOfCode,
} from "../openAi/openai.service";
import { matchImportSnippetWithExport } from "./codeSnippet.service";

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
  const codeExplaination = await getSummaryOfCode(snippet.code);

  const code_embedding = await createEmbeddings([snippet.code]);

  let code_explaination = null;
  let code_explaination_embedding = null;

  if (codeExplaination) {
    code_explaination = codeExplaination;
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

export const findSnippetByMethodNameAndAccount = async (
  name: string,
  accountId: string
) => {
  const { data, error } = await supabase
    .from("code_snippet")
    .select(
      "code_string, id, name, file_name, parsed_code_type, relative_file_path, updated_at, account_id"
    )
    .not("code_string", "is", null)
    .eq("name", name)
    .eq("account_id", accountId)
    .limit(1);

  if (error) {
    console.log("Error finding snippet by method name and account", error);
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
    return found.data[0];
  } else {
    return await supabase
      .from("export_import_snippet_map")
      .insert([value])
      .select("*");
  }
};

export const getLongExportSnippets = async (minLength: number) => {
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
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Error finding long snippets", error);
    return [];
  }

  return data;
};

export const getLongSnippetsWhereExternalMethodNull = async (
  minLength: number
) => {
  const { data, error } = await supabase
    .rpc("find_long_snippets", {
      line_count: minLength,
    })
    .not("code_string", "is", null)
    .not("file_name", "is", null)
    .not("account_id", "is", null)
    .not("code_string", "is", null)
    .is("has_external_methods", null)
    .select("*, code_file(*)")
    .order("created_at", { ascending: false });

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

export interface CodeSnippet {
  id: number;
  name: string;
  code_string: string;
  file_name: string;
  relative_file_path: string;
  parsed_code_type: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  code_file_id: number;
}

export interface ExportImportSnippetMap {
  id: string;
  export_id: number;
  import_id: number;
  code_snippet: CodeSnippet;
}

export interface FindCodeSnippetById {
  id: number;
  name: string;
  code_string: string;
  file_name: string;
  relative_file_path: string;
  parsed_code_type: string;
  account_id: string;
  created_at: string;
  updated_at: string;
  code_file_id: number;
  start_row: number;
  end_row: number;
  code_file: Database["public"]["Tables"]["code_file"]["Row"];
  export_import_snippet_map?: ExportImportSnippetMap[];
}

export async function findCodeSnippetById(
  id: number
): Promise<FindCodeSnippetById | null> {
  console.log(id);
  const { data, error } = await supabase
    .from("code_snippet")
    .select(
      "*, code_file(*), export_import_snippet_map!export_import_snippet_map_export_id_fkey(*, code_snippet!export_import_snippet_map_import_id_fkey(id, code_string))"
    )
    .eq("id", id)
    .limit(1);

  if (error) {
    console.log("Error finding snippet by id", error);
    return null;
  }
  if (!data) {
    console.log("No data found for snippet by id", error);
    return null;
  }
  console.log("data", data);
  return data[0] as any;
}
