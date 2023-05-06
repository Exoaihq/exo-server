import { findCompletedTasksThatNeedLoops } from "../server/api/agent/agent.context";
import { findAndExecuteTasks } from "../server/api/task/task.service";

const cron = require("node-cron");

export function runTasksAndAgents() {
  cron.schedule("*/10 * * * * *", () => {
    // This find tasks that have been created by agents and executes them.
    findAndExecuteTasks();

    // Find completed task and ask the user for next steps.
    findCompletedTasksThatNeedLoops();
  });
}
