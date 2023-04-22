import { executeTask, runTaskLoop } from "../agent/agent.act";
import { getIncompleteTasks } from "./task.repository";

export async function findAndExecuteTasks() {
  // Find all tasks that are not completed, have an input and no output

  const tasks = await getIncompleteTasks();
  console.log("Incomplete tasks:", tasks.length);

  // Execute each task
  for (const task of tasks) {
    if (task.id === "d63b2cd3-ae2e-4640-9fe2-7fd88b99f7e1") {
      executeTask(task);
    }
  }
}
