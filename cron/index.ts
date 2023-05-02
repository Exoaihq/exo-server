import { findAndAddTestAgent } from "../server/api/agent/autoAgents/addTests.agent";
import { improveCodeAgent } from "../server/api/agent/autoAgents/improveCodeAgent";
import {
  findFilesForSavedDirectories,
  findMissingDirectoryNodes,
  getCodeStandards,
  getFilesAndMapToDirectories,
  updateDirectoryExplaination,
} from "../server/api/codeDirectory/codeDirectory.service";
import { createExoConfig } from "../server/api/codeFile/codeFile.repository";
import { findFilesWithoutExplainationAndAssignExplaination } from "../server/api/codeFile/codeFile.service";
import {
  findAllImportStatements,
  findSnippetsWithoutFilesAndAssignFiles,
  matchExportsInSnippetBody,
  updateCodeSnippetNames,
} from "../server/api/codeSnippet/codeSnippet.service";
import { findCodeNodes } from "../server/api/exportImportMap/exportImportMap.service";
import { findAndExecuteTasks } from "../server/api/task/task.service";

const cron = require("node-cron");

export const runScheduledTasks = () => {
  // Every 10 minutes
  cron.schedule("*/10 * * * *", () => {
    console.log("Running find snippets without files and assign files");
    findSnippetsWithoutFilesAndAssignFiles();
    findFilesWithoutExplainationAndAssignExplaination();
  });
  //Every 15 minutes
  cron.schedule("*/15 * * * *", () => {
    findFilesForSavedDirectories();
  });

  cron.schedule("*/8 * * * * ", () => {
    getFilesAndMapToDirectories();
  });

  cron.schedule("*/5 * * * *", () => {
    updateDirectoryExplaination();
  });

  cron.schedule("*/6 * * * *", () => {
    findMissingDirectoryNodes();
  });

  cron.schedule("*/3 * * * * ", () => {
    findAndExecuteTasks();
  });

  // cron.schedule("*/5 * * * * *", () => {
  //   console.log("Running improve code script");
  //   runImproveCodeScript();
  // });

  // cron.schedule("*/10 * * * * ", () => {
  //   console.log("Running update code names script");
  //   updateCodeSnippetNames();
  // });

  // // Maps imports and exports (many to many) in the db.
  // cron.schedule("*/12 * * * * ", () => {
  //   console.log("Running match imports with exports script");
  //   findAllImportStatements();
  // });

  // This gets the export snippets that are imported the most
  // cron.schedule("*/12 * * * *  ", () => {
  //   console.log("Running finding code nodes script");
  //   findCodeNodes();
  // });

  // cron.schedule("*/2 * * * * ", () => {
  //   findAndAddTestAgent();
  // });

  // cron.schedule("*/40 * * * * *", () => {
  //   console.log("Running improve code script");
  //   improveCodeAgent();
  // });

  // Looks at all code snippets code and finds all methods that are imported into the snippet
  // const task = cron.schedule("*/12 * * * * *", () => {
  //   console.log("Running match exports in snippet body script");
  //   matchExportsInSnippetBody();
  //   task.stop();
  // });
};
