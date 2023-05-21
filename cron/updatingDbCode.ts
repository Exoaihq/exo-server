import {
  findFilesForSavedDirectories,
  findMissingDirectoryNodes,
  getFilesAndMapToDirectories,
  updateDirectoryExplaination,
} from "../server/api/codeDirectory/codeDirectory.service";
import {
  findAndAddDependenciesPerFile,
  findFilesWithoutExplainationAndAssignExplaination,
} from "../server/api/codeFile/codeFile.service";
import {
  findSnippetsWithoutFilesAndAssignFiles,
  updateCodeSnippetNames,
} from "../server/api/codeSnippet/codeSnippet.service";

const cron = require("node-cron");

export const runUpdateCodeDbEntries = () => {
  cron.schedule("*/6 * * * *", () => {
    // Subdirectories are not uploaded to the database. This finds all subdirectories and uploads them to the database. This looks at the code files and finds any subdirectories that are not in the database.
    findMissingDirectoryNodes();
  });

  cron.schedule("*/5 * * * *", () => {
    // Finds all the files in a directory and uses the explaination to update the directory explaination.
    updateDirectoryExplaination();
  });

  cron.schedule("*/8 * * * * ", () => {
    // This finds all files without a directory id and assigns it
    getFilesAndMapToDirectories();
  });

  cron.schedule("*/10 * * * *", () => {
    console.log("Running find snippets without files and assign files");
    // Often a code snippet and the code file are not linked together when they are created. This finds all snippets without files and assigns them to the correct file. It creates a new file if it doesn't exist.
    findSnippetsWithoutFilesAndAssignFiles();
  });

  cron.schedule("*/12 * * * *", () => {
    // When files are added the explanation is not run becuase it requires the list of snippets to have explanation first. This finds all files without explanation and assigns them an explanation.
    findFilesWithoutExplainationAndAssignExplaination();
  });

  cron.schedule("*/15 * * * *", () => {
    // This matches any files  with directories that have been saved by the user.
    findFilesForSavedDirectories();

    // Some snippets are created but the methods are not named. This finds all snippets without names and assigns them a name.
    //TODO - makes sure snippets are named when they are created
    updateCodeSnippetNames();
  });

  cron.schedule("*/5 * * * * ", () => {
    // This creates the d.ts contents for each file in the database - it stores the contents of the d.ts file in the database (vs actually creating the d.ts file).
    findAndAddDependenciesPerFile();
  });
};
