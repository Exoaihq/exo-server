import { findFilesForSavedDirectories } from "../server/api/codeDirectory/codeDirectory.service";
import { findFilesWithoutExplainationAndAssignExplaination } from "../server/api/codeFile/codeFile.service";
import { findSnippetsWithoutFilesAndAssignFiles } from "../server/api/codeSnippet/codeSnippet.service";

const cron = require("node-cron");

export const runScheduledTasks = () => {
  //Every 10 minutes
  // cron.schedule("*/10 * * * *", () => {
  //   console.log("Running find snippets without files and assign files");
  //   findSnippetsWithoutFilesAndAssignFiles();
  //   findFilesWithoutExplainationAndAssignExplaination();
  // });
  // //Every 15 minutes
  // cron.schedule("* */15 * * * *", () => {
  //   findFilesForSavedDirectories();
  // });
};
