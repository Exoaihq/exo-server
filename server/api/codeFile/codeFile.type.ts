import { Database } from "../../../types/supabase";
import { CodeSnippet } from "../codeSnippet/codeSnippet.type";

export type File = Database["public"]["Tables"]["code_file"]["Row"];

export type FileWithSnippets = File & { code_snippet: CodeSnippet[] };
