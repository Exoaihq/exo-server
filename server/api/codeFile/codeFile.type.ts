import { Database } from "../../../types/supabase";
import { CodeSnippet } from "../codeSnippet/codeSnippet.type";

export type DbFile = Database["public"]["Tables"]["code_file"]["Row"];

export type FileWithSnippets = DbFile & { code_snippet: CodeSnippet[] };

export type FileWithConfirmedContentAndAccount = {
  id: number;
  file_name: string;
  content: string;
  account_id: string;
};
