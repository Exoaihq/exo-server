import { Database } from "../../../types/supabase";
import {
  extractFileNameAndPathFromFullPath,
  getFileSuffix,
} from "../../../utils/getFileName";
import {
  findAllFilesWhereParentIsNull,
  findFilesByAccountId,
  findFilesByAccountIdAndDirectoryId,
  findFilesByDirectoryId,
  updateFileById,
} from "../codeFile/codeFile.repository";
import { createEmbeddings } from "../openAi/openAi.repository";
import {
  createTextCompletion,
  summarizeDirectoryExplaination,
} from "../openAi/openai.service";
import {
  createCodeDirectory,
  createCodeDirectoryByUser,
  findAllDirectories,
  findCodeDirectoryByNameAndUser,
  findCodeDirectoryByPathAndAccountId,
  getDirectoriesByParentId,
  getDirectoriesWithoutExplainations,
  getSavedDirectoryWhereAccountIsNotNull,
  updateCodeDirectoryById,
} from "./codeDirectory.repository";
import { DirectoryWithFiles } from "./codeDirectory.types";

export const createDirectoryIfNotExists = async (
  userId: string,
  filePath: string,
  directoryName: string,
  saved: boolean
) => {
  const found = await findCodeDirectoryByNameAndUser(userId, directoryName);
  if (!found) {
    await createCodeDirectoryByUser(userId, filePath, directoryName, saved);
  }
};

export const findFilesForSavedDirectories = async () => {
  const savedDirectories = await getSavedCodeDirectoriesByAccount();

  for (let [accountId, directory] of savedDirectories) {
    const filesByAccount = await findFilesByAccountId(accountId);
    console.log(filesByAccount?.length, accountId);

    if (!filesByAccount) {
      continue;
    }

    for (let file of filesByAccount) {
      if (!file || !file.file_path || !file.id || file.code_directory_id) {
        continue;
      }
      // Find the directory that matches the file path
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

export interface GetDirectoriesWithSnippetCount {
  directoryFileCount: {
    name: string;
    fileCount: number;
  }[];
  savedDirectoryCount: number;
  directoryCount: number;
}

export const getDirectoryFilesAndSnippetCount = (
  directories: DirectoryWithFiles[]
): GetDirectoriesWithSnippetCount => {
  const savedDirectories = directories.filter((dir) => dir.saved);
  const fileCount = savedDirectories.map((dir) => {
    return {
      name: dir.directory_name || "",
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
  if (!directories || directories.length === 0) {
    return;
  }

  for (let directory of directories) {
    const { account_id, id } = directory;
    // get all files in the directory
    if (account_id && id) {
      const files = await findFilesByAccountIdAndDirectoryId(account_id, id);
      console.log("Total files in directory", files?.length);

      const childDirectories = await getDirectoriesByParentId(id);

      let directoriesToSummarize: string = "";

      if (childDirectories && childDirectories.length > 0) {
        directoriesToSummarize = childDirectories
          .slice(0, 5)
          .map((dir) => dir.directory_explaination)
          .join(", ");
      }

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

      const summariesWithExplaination = ` 
        This is a directory that contains code files: 
        ${filesToSumarize}
        It also may contain other directories:
        ${directoriesToSummarize}

        The files and directories are summarised above. 
        
        The name of the directory is ${directory.directory_name}. Summarize an explanation of this directory into a paragraph:`;

      console.log("Summarizing", summariesWithExplaination);

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

export const findMissingDirectoryNodes = async () => {
  const directories = await findAllDirectories();
  if (!directories || directories.length === 0) {
    return;
  }

  for (let directory of directories!) {
    const {
      account_id,
      id,
      file_path,
      is_root_directory,
      parent_directory_id,
    } = directory;
    if (file_path && account_id && !is_root_directory) {
      // get the parent directory
      const { extractedPath } = extractFileNameAndPathFromFullPath(file_path);

      if (extractedPath) {
        const parentDirectory = await findCodeDirectoryByPathAndAccountId(
          account_id,
          extractedPath
        );
        if (!parentDirectory) {
          const name = extractFileNameAndPathFromFullPath(extractedPath);

          // create the parent directory
          const created = await createCodeDirectory({
            file_path: extractedPath,
            account_id,
            directory_name: name.fileName,
            saved: false,
          });

          // update the directory with the parent id
          await updateCodeDirectoryById(id, {
            parent_directory_id: created.id,
            updated_at: new Date().toISOString(),
          });

          console.log(
            "Created directory",
            created.file_path,
            created.directory_name
          );
        } else {
          if (!parentDirectory.id) {
            // update the directory with the parent id
            const updated = await updateCodeDirectoryById(id, {
              parent_directory_id: parentDirectory.id,
              updated_at: new Date().toISOString(),
            });
            if (updated) {
              console.log("Added parent directory");
            }
          }
        }
      }
    }
  }
};

export const getCodeStandards = async (
  directoryId: number
): Promise<string[]> => {
  const filesInDirectory = await findFilesByDirectoryId(directoryId);

  console.log("Files in directory", filesInDirectory?.length);

  const getFileSufficeCount = filesInDirectory?.map((file) => {
    const { file_name } = file;
    if (file_name) {
      const fileSuffix = getFileSuffix(file_name);
      return fileSuffix;
    }
  });

  if (!getFileSufficeCount) {
    return [];
  }

  const uniquieFileSuffixes = getFileSufficeCount?.filter(
    (value, index, self) => {
      return self.indexOf(value) === index;
    }
  );
  console.log("Unique file suffixes", uniquieFileSuffixes);

  const uniqueSuffixCount: {
    suffix: string | undefined;
    count: number | undefined;
    percentage?: number;
  }[] = [];

  uniquieFileSuffixes?.forEach(async (suffix) => {
    uniqueSuffixCount.push({
      suffix,
      count: getFileSufficeCount?.filter((s) => s === suffix).length,
      percentage:
        getFileSufficeCount?.filter((s) => s === suffix).length /
        getFileSufficeCount?.length,
    });
  });

  const codeStandards: string[] = [];

  for (let item of uniqueSuffixCount) {
    const { suffix, count, percentage } = item;
    // If the file name suffix is greater than 20% of the files in the directory we'll ask for coding standards
    if (suffix && count && percentage && percentage > 0.2) {
      const res = await createTextCompletion(
        `This directory contains ${count} files with the suffix ${suffix}. What are coding best practices for this file type? Return a numbered list.
        `,
        1,
        "Running code standards analysis",
        "chat"
      );

      if (!res) {
        return [];
      }
      // Get the text after the numbered list and add it to the array
      const regex = /^\d+\.\s+(.*)$/gm;

      // Use the regex to extract the text after the number and period for each match in the input string
      const matches = res.matchAll(regex);

      for (const match of matches) {
        // Extract the capture group containing the text after the number and period
        const item = match[1];

        // Add the item to the result array
        codeStandards.push(item);
      }
    }
  }

  return codeStandards;
};
