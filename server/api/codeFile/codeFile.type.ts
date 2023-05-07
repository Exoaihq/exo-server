import { Database } from "../../../types/supabase";
import { CodeSnippet } from "../codeSnippet/codeSnippet.type";

export type DbFile = Database["public"]["Tables"]["code_file"]["Row"];

export type FileWithSnippets = DbFile & { code_snippet: CodeSnippet[] };
