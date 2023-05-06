import { Database } from "../../../types/supabase";

export type CodeSnippet = Database["public"]["Tables"]["code_snippet"]["Row"];
