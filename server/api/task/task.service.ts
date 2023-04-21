import { executeTask, runTaskLoop } from "../agent/agent.act";
import { getIncompleteTasks } from "./task.repository";

export async function findAndExecuteTasks() {
  // Find all tasks that are not completed, have an input and no output

  const tasks = await getIncompleteTasks();
  console.log("Incomplete tasks:", tasks.length);

  // Execute each task
  for (const task of tasks) {
    if (task.objective_id === "0552e20a-76b2-4b9f-9514-88a90bb78bbd") {
      executeTask(task);
    }
  }
}
