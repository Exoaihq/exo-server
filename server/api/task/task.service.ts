import { logInfo } from "../../../utils/commandLineColors";
import { executeTask, runTaskLoop } from "../agent/agent.act";
import { getIncompleteTasks, updateTaskById } from "./task.repository";

export async function findAndExecuteTasks() {
  // Find all tasks that are not completed, have an input and no output

  const tasks = await getIncompleteTasks();
  logInfo(`Incomplete tasks: ${tasks.length}`);

  // Execute each task
  for (const task of tasks) {
    executeTask(task);

    // Completes all the outstanding tasks - good for reseting the database
    // await updateTaskById(task.id, {
    //   completed_at: new Date().toISOString(),
    // });
  }
}
