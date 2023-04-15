import { createClient, PostgrestError } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import {
  findFileByAccountId,
  updateFileById,
} from "../codeFile/codeFile.repository";
import { findOrUpdateAccount } from "../supabase/account.service";

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const createDirectoryIfNotExists = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  filePath: string,
  directoryName: string,
  saved: boolean
) => {
  const found = await findCodeDirectoryByNameAndUser(user, directoryName);
  if (!found) {
    await createCodeDirectory(user, filePath, directoryName, saved);
  }
};

export const createCodeDirectory = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  filePath: string,
  directoryName: string,
  saved: boolean
): Promise<Database["public"]["Tables"]["code_directory"]["Insert"]> => {
  const account = await findOrUpdateAccount(user);

  const { data } = await supabase
    .from("code_directory")
    .insert([
      {
        file_path: filePath,
        directory_name: directoryName,
        account_id: account ? account.id : null,
        saved,
      },
    ])
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["code_directory"]["Row"];
};

export const findCodeDirectoryByNameAndUser = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  directoryName: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"] | null> => {
  const account = await findOrUpdateAccount(user);

  const { data, error } = await supabase
    .from("code_directory")
    .select("*")
    .eq("account_id", account ? account.id : null)
    .eq("directory_name", directoryName);

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data[0];
  }
};

export const getCodeDirectories = async (
  accountId: string
): Promise<Database["public"]["Tables"]["code_directory"]["Row"][] | null> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*, code_file(*)")
    .eq("account_id", accountId)
    .order("indexed_at", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    return data;
  }
};

export const getSavedCodeDirectories = async (): Promise<
  Database["public"]["Tables"]["code_directory"]["Row"][] | null
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*, code_file(*)")
    .eq("saved", true);

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    console.log("Save directory count:", data.length);
    return data;
  }
};

export const getSavedCodeDirectoriesGroupByAccount = async (): Promise<
  Database["public"]["Tables"]["code_directory"]["Row"][] | null
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .select("*, code_file(*)")
    .eq("saved", true)
    .order("account_id", { ascending: true });

  if (error) {
    console.log("Getting code error", error);
  }

  if (!data || !data[0]) {
    return null;
  } else {
    console.log("Save directory count:", data.length);
    return data;
  }
};

export const updateCodeDirectoryById = async (
  id: string,
  values?: Partial<Database["public"]["Tables"]["code_directory"]["Update"]>
): Promise<
  Partial<
    Database["public"]["Tables"]["code_directory"]["Update"] | PostgrestError
  >
> => {
  const { data, error } = await supabase
    .from("code_directory")
    .update({ ...values })
    .eq("id", id)
    .select();

  if (error || !data) {
    console.log("Error updating code directory", error);
    return error;
  }

  return data[0] as Database["public"]["Tables"]["code_directory"]["Row"];
};

export const findFilesForSavedDirectories = async () => {
  const savedDirectories = await getSavedCodeDirectoriesByAccount();

  for (let [accountId, directory] of savedDirectories) {
    const filesByAccount = await findFileByAccountId(accountId);
    console.log(filesByAccount?.length, accountId);

    if (!filesByAccount) {
      continue;
    }

    for (let file of filesByAccount) {
      if (!file || !file.file_path || !file.id || file.code_directory_id) {
        continue;
      }
      // Find the directory that matches the file path
      // @ts-ignore
      const found = directory.find((dir) =>
        // @ts-ignore
        file?.file_path.includes(dir.file_path)
      );
      if (found) {
        // Update the directory with the file id
        await updateFileById(file.id, {
          code_directory_id: found.id,
        });
      }
    }
  }
};

async function getSavedCodeDirectoriesByAccount(): Promise<
  Map<string, Partial<Database["public"]["Tables"]["code_directory"]["Row"]>[]>
> {
  // Fetch data and error from the "code_directory" table
  const { data, error } = await supabase
    .from("code_directory")
    .select("id, saved, account_id, file_path, directory_name")
    .eq("saved", true)
    .not("account_id", "is", null)
    .order("account_id", { ascending: true });

  if (error) {
    console.error("Error fetching code directories:", error);
    return new Map<
      string,
      Database["public"]["Tables"]["code_directory"]["Row"][]
    >();
  }

  const directoriesByAccount = new Map<
    string,
    {
      id: number;
      saved: boolean | null;
      account_id: string | null;
      file_path: string | null;
      directory_name: string | null;
    }[]
  >();

  if (data) {
    for (const directory of data) {
      const accountId = directory.account_id as string;

      if (directoriesByAccount.has(accountId)) {
        directoriesByAccount.get(accountId)!.push(directory);
      } else {
        directoriesByAccount.set(accountId, [directory]);
      }
    }
  }

  return directoriesByAccount;
}

export const getDirectoryFilesAndSnippetCount = (
  directories: Database["public"]["Tables"]["code_directory"]["Row"][]
) => {
  const savedDirectories = directories.filter((dir) => dir.saved);
  const fileCount = savedDirectories.map((dir) => {
    return {
      name: dir.directory_name,
      //@ts-ignore
      fileCount: dir.code_file?.length,
    };
  });

  return {
    directoryCount: directories.length,
    savedDirectoryCount: savedDirectories.length,
    directoryFileCount: fileCount,
  };
};
