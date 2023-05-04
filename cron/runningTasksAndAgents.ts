import { findAndExecuteTasks } from "../server/api/task/task.service";

const cron = require("node-cron");

export function runTasksAndAgents() {
  cron.schedule("*/10 * * * * *", () => {
    // This find tasks that have been created by agents and executes them.
    findAndExecuteTasks();
  });
}
