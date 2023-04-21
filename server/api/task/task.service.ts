import { executeTask, runTaskLoop } from "../agent/agent.act";
import { getIncompleteTasks } from "./task.repository";

export async function findAndExecuteTasks() {
  // Find all tasks that are not completed, have an input and no output

  const tasks = await getIncompleteTasks();
  console.log("Incomplete tasks:", tasks.length);

  // Execute each task
  for (const task of tasks) {
    if (task.objective_id === "eadc3eaf-aef0-4db7-8628-6caba99951de") {
      console.log("Task", task);
      executeTask(task);
    }
  }
}
