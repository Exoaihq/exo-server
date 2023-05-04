import { Database } from "../../../types/supabase";

export type Directories = Database["public"]["Tables"]["code_directory"]["Row"];
export type Files = Database["public"]["Tables"]["code_file"]["Row"][];
export type DirectoryWithFiles = Directories & { code_file: Files[] };
