import { executeTask, runTaskLoop } from "../agent/agent.act";
import { getIncompleteTasks } from "./task.repository";

export async function findAndExecuteTasks() {
  // Find all tasks that are not completed, have an input and no output

  const tasks = await getIncompleteTasks();
  console.log("Incomplete tasks:", tasks.length);

  // Execute each task
  for (const task of tasks) {
    if (task.id === "6e42db03-298a-4f39-87a7-cd5d3108eaf3") {
      executeTask(task);
    }
  }
}
