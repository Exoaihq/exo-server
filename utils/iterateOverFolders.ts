import * as fs from "fs";
import {
  compareAndUpdateSnippets,
  findSnippetByFileName,
} from "../server/api/supabase.service";

const foldersToExclude = [
  "node_modules",
  "dist",
  ".vscode",
  ".git",
  "yarn.lock",
];

const filesToExcule = ["yarn.lock", ".json"];

function doesPathContainFolderToExclude(path: string): boolean {
  return foldersToExclude.some((folder) => path.includes(folder));
}

function doesPathContainFileToExclude(path: string): boolean {
  return filesToExcule.some((file) => path.includes(file));
}

export const iterateOverFolderAndHandleFileContents = async (
  folderPath: string,
  handleFile: any,
  handleSnippet: any
) => {
  let output = "";

  if (doesPathContainFolderToExclude(folderPath)) {
    console.log("Skipping >>>>>>>>>>>>>>>>>>", folderPath);
  } else {
    fs.readdir(folderPath, async (err: any, files: any) => {
      for await (const file of files) {
        const filePath = `${folderPath}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          console.log("File path >>>>>>>>>>>>>>>>>>", filePath);

          const contents = fs.readFileSync(filePath, "utf8");

          handleFile({ filePath, contents }, handleSnippet);
        } else if (stats.isDirectory()) {
          console.log("Folder >>>>>>>>>>>>>>>>>>");
          output += iterateOverFolderAndHandleFileContents(
            filePath,
            handleFile,
            handleSnippet
          );
        }
      }
    });
  }

  return output;
};

export const iterateOverFolder = async (
  folderPath: string,
  handleFolder: any
) => {
  fs.readdir(folderPath, async (err: any, files: any) => {
    for await (const file of files) {
      const filePath = `${folderPath}/${file}`;
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        console.log("Folder >>>>>>>>>>>>>>>>>>", filePath);
        await handleFolder(filePath);
        iterateOverFolder(filePath, handleFolder);
      }
    }
  });
};

export const iterateOverFolderAndHandleFile = async (
  folderPath: string,
  handleFile: any
) => {
  fs.readdir(folderPath, async (err: any, files: any) => {
    for await (const file of files) {
      const filePath = `${folderPath}/${file}`;
      const stats = fs.statSync(filePath);
      if (stats.isFile()) {
        await handleFile(filePath);
      } else if (stats.isDirectory()) {
        if (
          filePath.includes("node_modules") ||
          filePath.includes("dist") ||
          filePath.includes(".vscode") ||
          filePath.includes(".git")
        ) {
          console.log("Skipping >>>>>>>>>>>>>>>>>>", filePath);
        } else {
          iterateOverFolderAndHandleFile(filePath, handleFile);
        }
      }
    }
  });
};

export const findFoldersThatDontHaveExplainations = async (
  folderPath: string,
  handleFolder: any
) => {
  let foldersThatDontHaveExplainations = [];
  fs.readdir(folderPath, async (err: any, files: any) => {
    for await (const file of files) {
      const filePath = `${folderPath}/${file}`;
      const stats = fs.statSync(filePath);
      if (stats.isDirectory()) {
        if (containsOnlyFiles(filePath)) {
          // check for explaination
          // if no explaination create it
        }

        console.log("Folder >>>>>>>>>>>>>>>>>>", filePath);
        await handleFolder(filePath);
        iterateOverFolder(filePath, handleFolder);
      }
    }
  });
};

const containsOnlyFiles = (folderPath: string): boolean => {
  const files = fs.readdirSync(folderPath);
  return files.findIndex((file: string) => fs.statSync(file).isFile()) === -1
    ? false
    : true;
};

export const iterateOverFolderAndHandleAndUpdateFileContents = async (
  folderPath: string,
  handleFile: any,
  handleSnippet: any,
  printTotalsOnly: boolean = false
) => {
  let output = "";

  let totalUpdateCount = 0;
  let totalMatchedCount = 0;
  let totalNotFound = 0;

  if (doesPathContainFolderToExclude(folderPath)) {
    console.log("Skipping >>>>>>>>>>>>>>>>>>", folderPath);
  } else {
    fs.readdir(folderPath, async (err: any, files: any) => {
      for await (const file of files) {
        const filePath = `${folderPath}/${file}`;
        const stats = fs.statSync(filePath);
        if (stats.isFile()) {
          if (doesPathContainFileToExclude(filePath)) {
            console.log("Skipping >>>>>>>>>>>>>>>>>>", filePath);
            continue;
          }

          const contents = fs.readFileSync(filePath, "utf8");

          // Find all code snippets for this file
          const snippets = await findSnippetByFileName(file);

          if (snippets && snippets?.length > 0) {
            // Update the file with the snippet

            const { updateCount, matchedCount, notFound } =
              await compareAndUpdateSnippets(
                { filePath, contents },
                snippets,
                printTotalsOnly
              );

            totalUpdateCount += updateCount;
            totalMatchedCount += matchedCount;
            totalNotFound += notFound;
          }
        } else if (stats.isDirectory()) {
          iterateOverFolderAndHandleAndUpdateFileContents(
            filePath,
            handleFile,
            handleSnippet,
            printTotalsOnly
          );
        }
      }

      console.log("Total update count >>>>>>>>>>>>>>>>>>", totalUpdateCount);
      console.log("Total matched count >>>>>>>>>>>>>>>>>>", totalMatchedCount);
      console.log("Total not found ", folderPath, totalNotFound);
    });
  }

  return {
    totalUpdateCount,
    totalMatchedCount,
    totalNotFound,
  };
};
