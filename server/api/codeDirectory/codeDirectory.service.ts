import { Database } from "../../../types/supabase";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import {
  findAllFilesWhereParentIsNull,
  findFileByAccountId,
  findFilesByAccountIdAndDirectoryId,
  updateFileById,
} from "../codeFile/codeFile.repository";
import {
  createEmbeddings,
  summarizeDirectoryExplaination,
} from "../openAi/openai.service";
import {
  createCodeDirectory,
  createCodeDirectoryByUser,
  findCodeDirectoryByNameAndUser,
  findCodeDirectoryByPathAndAccountId,
  getDirectoriesWithoutExplainations,
  getSavedDirectoryWhereAccountIsNotNull,
  updateCodeDirectoryById,
} from "./codeDirectory.repository";

export const createDirectoryIfNotExists = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  filePath: string,
  directoryName: string,
  saved: boolean
) => {
  const found = await findCodeDirectoryByNameAndUser(user, directoryName);
  if (!found) {
    await createCodeDirectoryByUser(user, filePath, directoryName, saved);
  }
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

  const data = await getSavedDirectoryWhereAccountIsNotNull();

  if (!data) {
    console.error("Error fetching code directories");
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

export const getFilesAndMapToDirectories = async () => {
  // get all files
  const allFiles = await findAllFilesWhereParentIsNull();
  console.log("files without parents", allFiles?.length);

  // Check each file to see if there is a parent directory

  for (let file of allFiles!) {
    const { file_path, id, account_id } = file;
    // create the parent directory if it does not exist
    if (file_path && account_id && id) {
      const foundDirectory = await findCodeDirectoryByPathAndAccountId(
        account_id,
        file_path
      );
      if (!foundDirectory) {
        const { fileName } = extractFileNameAndPathFromFullPath(file_path);
        await createCodeDirectory({
          file_path,
          account_id,
          directory_name: fileName,
          saved: false,
        });
      } else {
        // Update the file with the directory id
        await updateFileById(id, {
          code_directory_parent_id: foundDirectory.id,
        });
      }
    }
  }
};

export const updateDirectoryExplaination = async () => {
  // Get all directories without explaination and update them
  const directories = await getDirectoriesWithoutExplainations();
  if (!directories) {
    return;
  }

  for (let directory of directories) {
    const { account_id, id } = directory;
    // get all files in the directory
    if (account_id && id) {
      const files = await findFilesByAccountIdAndDirectoryId(account_id, id);
      console.log("Total files in directory", files?.length);

      let filesToSumarize: string = "";

      if (files && files.length > 0 && files.length < 10) {
        filesToSumarize = files
          .map((file) => file.file_explaination)
          .join(", ");
      } else if (files && files.length > 0 && files.length > 10) {
        // Get random 10 files
        const shuffledFile = files.sort(() => 0.5 - Math.random());
        const selectedFiles = shuffledFile.slice(0, 10);

        filesToSumarize = selectedFiles
          .map((file) => file.file_explaination)
          .join(", ");
      }

      const summariesWithExplaination =
        filesToSumarize +
        `This is a directory that contains code files. The files are summarised above. The name of the directory is ${directory.directory_name}. Summarize an explanation of this directory into a paragraph:`;

      const summary = await summarizeDirectoryExplaination(
        summariesWithExplaination
      );

      if (!summary) {
        continue;
      }

      const embedding = await createEmbeddings([summary]);

      if (summary && embedding) {
        await updateCodeDirectoryById(id, {
          directory_explaination: summary,
          directory_explaination_embedding: embedding,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }
};
