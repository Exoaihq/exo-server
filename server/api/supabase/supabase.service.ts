import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
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
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import { getSubstringFromMultilineCode } from "../../../utils/getSubstringFromMultilineCode";
import { parseFile } from "../../../utils/treeSitter";
import {
  addCodeToSupabase,
  deleteSnippetById,
} from "../codeSnippet/codeSnippet.repository";
import {
  createEmbeddings,
  createTextCompletion,
} from "../openAi/openai.service";

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export async function checkSessionOrThrow(
  req: Request,
  res: Response
): Promise<any> {
  const { access_token, refresh_token } = req.headers;

  const access = access_token as string;
  const refresh = refresh_token as string;

  const session = await checkSession({
    access_token: access,
    refresh_token: refresh,
  });

  if (!access_token || !refresh_token || !session || !session.data?.user) {
    return res
      .status(401)
      .json({ message: "You have to be logged in to do that" });
  }

  return session;
}

export async function checkSession(session: {
  access_token: string;
  refresh_token: string;
}) {
  return await supabase.auth.setSession(session);
}

export const findOrCreateSession = async (
  userId: string,
  sessionId: string
): Promise<Database["public"]["Tables"]["session"]["Row"]> => {
  const { data, error } = await supabase
    .from("session")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId);

  if (data && data.length > 0) {
    return data[0];
  } else {
    const { data, error } = await supabase
      .from("session")
      .insert([{ user_id: userId, id: sessionId }])
      .select();

    console.log("Session created. ID:", data && data[0].id);

    // @ts-ignore
    return data[0] as Database["public"]["Tables"]["session"]["Row"];
  }
};

export const getSessionById = async (
  sessionId: string
): Promise<Database["public"]["Tables"]["session"]["Row"]> => {
  const { data, error } = await supabase
    .from("session")
    .select("*")
    .eq("id", sessionId);

  if (error || !data || data.length === 0) {
    throw new Error("Can't find the users session");
  }

  return data[0];
};

export const updateSession = async (
  userId: string,
  sessionId: string,
  session: Partial<Database["public"]["Tables"]["session"]["Update"]>
): Promise<any> => {
  const { data } = await supabase
    .from("session")
    .update({ ...session })
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select();
};

export const resetSession = (userId: string, sessionId: any) => {
  updateSession(userId, sessionId, {
    code_content: "",
    file_name: "",
    file_path: "",
    new_file: null,
    location: "",
    expected_next_action: null,
  });
};

// Use this function to update snippets in the database
export async function compareAndUpdateSnippets(
  contents: ParseCode,
  printTotalsOnly: boolean = false,
  accountId: string,
  snippets?: SnippetByFileName[] | null
) {
  const tree = await parseFile(contents.contents);
  const lines = contents.contents.split("\n");
  const addBackNewLine = lines.map((line: any) => `${line}\n`);

  const { fileName, extractedPath } = extractFileNameAndPathFromFullPath(
    contents.filePath
  );

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

  console.log("Elements to update", elementsToUpdate);
  // console.log("Elements to update", elementsToUpdate);
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
    directoryExplaination.choices[0].text?.trim(),
  ]);

  const dbRecord = {
    directory_explaination: directoryExplaination.choices[0].text?.trim(),
    directory_explaination_embedding,
    file_path: filePath,
    directory_name: directoryName,
  };

  const { data, error } = await supabase
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

  const { data, error } = await supabase.from("code_file").insert([dbRecord]);

  console.log(data, error);
}

export async function findFileId(fileName: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("code_file")
    .select("id")
    .eq("file_name", fileName);

  if (!data || !data[0]) {
    return null;
  }

  return data[0].id;
}

interface SnippetWithoutFiles {
  file_name: string | null;
  id: number;
}

export async function findAllSnippetWithoutFiles(): Promise<
  Partial<Database["public"]["Tables"]["code_snippet"]["Row"]>[] | null
> {
  const { data, error } = await supabase
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
  const { data, error } = await supabase
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

  const { data, error } = await supabase
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

    const explaination = fileExplaination.choices[0].text?.trim();

    const file_explaination_embedding = await createEmbeddings([explaination]);
    console.log(file_explaination_embedding);

    const dbRecord = {
      file_explaination: explaination,
      file_explaination_embedding,
    };

    const { data, error } = await supabase
      .from("code_file")
      .update(dbRecord)
      .eq("id", file.id);

    console.log(data, error);
  }
}

export async function updateOpenAiModels(models: AddModel[]) {
  const { data, error } = await supabase.from("openai_models").upsert(models);

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
  const { data, error } = await supabase.from("openai_models").select("*");

  return data;
}

function parsefile(contents: ParseCode) {
  throw new Error("Function not implemented.");
}
