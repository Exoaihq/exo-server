import { findAndAddTestAgent } from "../server/api/agent/autoAgents/addTests.agent";
import { improveCodeAgent } from "../server/api/agent/autoAgents/improveCodeAgent";
import {
  findAllImportStatements,
  matchExportsInSnippetBody,
  updateCodeSnippetNames,
} from "../server/api/codeSnippet/codeSnippet.service";
import { findCodeNodes } from "../server/api/exportImportMap/exportImportMap.service";
import { logInfo } from "../utils/commandLineColors";
import { runTasksAndAgents } from "./runningTasksAndAgents";
import { runUpdateCodeDbEntries } from "./updatingDbCode";

const cron = require("node-cron");

export const runScheduledTasks = () => {
  runUpdateCodeDbEntries();
  runTasksAndAgents();
  // Maps imports and exports (many to many) in the db.
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
  // cron.schedule("*/10 * * * * * ", () => {
  //   logInfo("Running improve code script");
  //   improveCodeAgent();
  // });
  // Looks at all code snippets code and finds all methods that are imported into the snippet.
  // cron.schedule("*/12 * * * *", () => {
  //   console.log("Running match exports in snippet body script");
  //   matchExportsInSnippetBody();
  // });
};
