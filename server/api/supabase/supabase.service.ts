import {
  Session,
  SupabaseClient,
  User,
  createClient,
} from "@supabase/supabase-js";
import { supabaseBaseServerClient } from "../../../server";
import { AddModel } from "../../../types/openAiTypes/openAiEngine";
import {
  Element,
  ParseCode,
  ParsedCode,
  ParsedDirectory,
  ParsedFile,
  SnippetByFileName,
} from "../../../types/parseCode.types";
import { Database } from "../../../types/supabase";
import { logError } from "../../../utils/commandLineColors";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { getSubstringFromMultilineCode } from "../../../utils/getSubstringFromMultilineCode";
import { getProgrammingLanguage, parseFile } from "../../../utils/treeSitter";
import {
  addCodeToSupabase,
  deleteSnippetById,
} from "../codeSnippet/codeSnippet.repository";
import { createEmbeddings } from "../openAi/openAi.repository";
import { createTextCompletion } from "../openAi/openai.service";

export type AuthResponseWithUser = {
  data: {
    user: User;
    session: Session;
  };
};

// An unauthenticated client is set on server init. This is used for public access. All protected routes require an authenticated client to be set and should use this client. This is created by the isAuthenticated middleware.
export let supabaseAuthenticatedServerClient: SupabaseClient<Database> | null =
  null;

export const authenticatedSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabaseAuthenticatedServerClient) {
    throw new Error("Authenticated supabase client not set");
  }
  return supabaseAuthenticatedServerClient;
};

export const setSupabaseAuthenticatedServerClient = async (
  refresh_token: string,
  access_token: string
) => {
  const supabase = await createClient<Database>(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    },
  });

  supabase.auth.setSession({ refresh_token, access_token });

  supabaseAuthenticatedServerClient = supabase;

  return supabase;
};

// Use this function to update snippets in the database
export async function compareAndUpdateSnippets(
  contents: ParseCode,
  accountId: string,
  snippets?: SnippetByFileName[] | null
) {
  const { fileName, extractedPath } = extractFileNameAndPathFromFullPath(
    contents.filePath
  );

  const language = getProgrammingLanguage(fileName);

  const tree = await parseFile(contents.contents, language);
  const lines = contents.contents.split("\n");
  const addBackNewLine = lines.map((line: any) => `${line}\n`);

  let numberFound = 0;
  let numberNotFound = 0;
  let matchedSnippets: any[] = [];
  let elementsToUpdate: ParsedCode[] = [];

  for await (const [index, element] of tree.rootNode.children.entries()) {
    const { startPosition, endPosition, type }: Element = element;
    const codeSnippet = getSubstringFromMultilineCode(
      addBackNewLine,
      startPosition.row,
      startPosition.column,
      endPosition.row,
      endPosition.column
    );

    if (
      type === "ERROR" ||
      type === "=" ||
      type === "(" ||
      type === ")" ||
      type === ">" ||
      type === "<"
    ) {
      continue;
    }
    const dbSnippetFound =
      snippets &&
      snippets.find((dbSnippet) => {
        return (
          dbSnippet.start_row === startPosition.row &&
          dbSnippet.end_row === endPosition.row &&
          dbSnippet.start_column === startPosition.column &&
          dbSnippet.end_column === endPosition.column
        );
      });

    if (!dbSnippetFound) {
      numberNotFound++;
      elementsToUpdate.push({
        code: codeSnippet,
        metadata: {
          element,
          filePath: extractedPath,
          type,
          fileName,
        },
      });
    } else {
      const match = codeSnippet === dbSnippetFound?.code_string;

      if (match) {
        numberFound++;
        matchedSnippets.push(dbSnippetFound.id);
      } else {
        numberNotFound++;
        elementsToUpdate.push({
          code: codeSnippet,
          metadata: {
            element,
            filePath: extractedPath,
            type,
            fileName,
          },
        });
      }
    }
  }

  console.log("Number found", numberFound);
  console.log("Number not found", numberNotFound);
  console.log("Matched snippets", matchedSnippets);

  const snippetsToDelete =
    snippets &&
    snippets.filter((snippet) => {
      return !matchedSnippets.includes(snippet.id);
    });

  snippetsToDelete &&
    snippetsToDelete.forEach(async (snippet) => {
      await deleteSnippetById(snippet.id);
    });

  elementsToUpdate.forEach(async (element) => {
    await addCodeToSupabase(element, accountId);
  });

  return {
    updateCount: elementsToUpdate.length,
    matchedCount: numberFound,
    notFound: elementsToUpdate.length,
  };
}

export async function addDirectoryToSupabase(directory: ParsedDirectory) {
  const { directoryName, filePath } = directory;

  const directoryExplaination = await createTextCompletion(
    "This is a folder directory that contains files with code. These are the explainations of what the files do:" +
      directory.files.concat.toString() +
      "Wrtie an exmplaination for this directory does."
  );

  const directory_explaination_embedding = await createEmbeddings([
    directoryExplaination.trim(),
  ]);

  const dbRecord = {
    directory_explaination: directoryExplaination.trim(),
    directory_explaination_embedding,
    file_path: filePath,
    directory_name: directoryName,
  };

  const { data, error } = await supabaseBaseServerClient
    .from("code_directory")
    .insert([dbRecord]);

  console.log(data, error);
}

export async function addFileToSupabase(parsedFile: ParsedFile) {
  const { fileName, filePath } = parsedFile;

  const dbRecord = {
    file_name: fileName,
    file_path: filePath,
  };

  const { data, error } = await supabaseBaseServerClient
    .from("code_file")
    .insert([dbRecord]);

  console.log(data, error);
}

interface SnippetWithoutFiles {
  file_name: string | null;
  id: number;
}

export async function findAllSnippetWithoutFiles(): Promise<
  Partial<Database["public"]["Tables"]["code_snippet"]["Row"]>[] | null
> {
  const { data, error } = await supabaseBaseServerClient
    .from("code_snippet")
    .select("*")
    .is("code_file_id", null);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function findSnippetByFileName(
  fileName: string
): Promise<SnippetByFileName[] | null> {
  const { data, error } = await supabaseBaseServerClient
    .from("code_snippet")
    .select(
      "file_name, id, code_file_id, code_string, code_explaination, start_row, start_column, end_row, end_column, parsed_code_type"
    )
    .eq("file_name", fileName);

  if (error) {
    console.log(error);
    return null;
  }
  if (!data) {
    return null;
  }
  return data;
}

export async function assignCodeSnippetToFile(
  fileId: number,
  codeSnippetId: number
) {
  const dbRecord = {
    code_file_id: fileId,
  };

  const { data, error } = await supabaseBaseServerClient
    .from("code_snippet")
    .update(dbRecord)
    .eq("id", codeSnippetId);

  console.log(data, error);
}

export interface CodeSnippet {
  id: number;
  file_name: string | null;
  code_explaination: string | null;
  parsed_code_type: string | null;
  code_string: string | null;
}

export function getPromptFromSnippets(
  snippets: CodeSnippet[] | CodeSnippet,
  codeLanguage: string = "Typescript"
) {
  const prefix = `This is a file that contains ${codeLanguage} code.`;
  const suffix =
    " Write an exmplaination for this file does. This file has code that ";

  if (!Array.isArray(snippets)) {
    return (
      prefix +
      " This is the explaination for what the code does:" +
      snippets.code_explaination +
      suffix
    );
  }

  // These are the import statements:" + get + "." + "These are the explainations of what the code does:" + exportExplainations.join(" ")
  let importStatements: string[] = [];
  let exportExplainations: (string | null)[] = [];

  snippets.forEach((s) => {
    if (s.parsed_code_type === "import_statement") {
      importStatements.push(
        s.code_string ? "import statement: " + s.code_string : ""
      );
    }
    if (
      s.parsed_code_type === "export_statement" ||
      s.parsed_code_type === "lexical_declaration"
    ) {
      exportExplainations.push("code explaination: " + s.code_explaination);
    }
  });

  return (
    prefix +
    " These are the import statements:" +
    "\n" +
    importStatements.join("\n") +
    "." +
    " These are the explainations of what the code does:" +
    exportExplainations.join("\n") +
    "\n" +
    suffix
  );
}

export async function assignExplainationsForFilesWhereNull(
  files:
    | {
        id: number;
        file_name: string | null;
        code_snippet: CodeSnippet | CodeSnippet[] | null;
      }[]
    | null
) {
  if (!files) {
    return;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (
      !file.code_snippet ||
      (Array.isArray(file.code_snippet) && file.code_snippet.length === 0)
    ) {
      continue;
    }

    const { code_snippet } = file;

    const prompt = getPromptFromSnippets(code_snippet);

    const fileExplaination = await createTextCompletion(prompt);
    console.log(fileExplaination);

    const explaination = fileExplaination?.trim();

    const file_explaination_embedding = await createEmbeddings([explaination]);
    console.log(file_explaination_embedding);

    const dbRecord = {
      file_explaination: explaination,
      file_explaination_embedding,
    };

    const { data, error } = await supabaseBaseServerClient
      .from("code_file")
      .update(dbRecord)
      .eq("id", file.id);

    console.log(data, error);
  }
}

export async function updateOpenAiModels(models: AddModel[]) {
  const { data, error } = await supabaseBaseServerClient
    .from("openai_models")
    .upsert(models);

  console.log(data, error);
}

export async function getOpenAiModelsFromDb(): Promise<
  | {
      created_at: string | null;
      id: string;
      object: string | null;
      ready: boolean | null;
      updated_at: string;
    }[]
  | null
> {
  const { data, error } = await supabaseBaseServerClient
    .from("openai_models")
    .select("*");

  return data;
}

export async function findUserByJwt(jwt: string) {
  const { data, error } = await supabaseBaseServerClient.auth.getUser(jwt);

  if (error) {
    logError(error.message ? error.message : "error finding user by id");
    return null;
  }

  return data.user;
}

export async function findDbUserByJwt(jwt: string) {
  const authUser = await findUserByJwt(jwt);

  const { data, error } = await authenticatedSupabaseClient()
    .from("users")
    .select("*")
    .eq("email", authUser?.email);

  if (error) {
    logError(error.message ? error.message : "error finding user by id");
    return null;
  }

  return data;
}
