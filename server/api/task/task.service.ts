import { logInfo } from "../../../utils/commandLineColors";
import { executeTask, runTaskLoop } from "../agent/agent.act";
import { isSearchTool } from "../agent/agent.context";
import { getToolByNames } from "../agent/agent.service";
import { allTools } from "../agent/tools";
import { getObjectiveById } from "../objective/objective.repository";
import { getSessionById } from "../supabase/supabase.service";
import { getIncompleteTasks, updateTaskById } from "./task.repository";

export async function findAndExecuteTasks() {
  // Find all tasks that are not completed, have an input and no output

  const tasks = await getIncompleteTasks();
  logInfo(`Incomplete tasks: ${tasks.length}`);

  // Execute each task
  for (const task of tasks) {
    if (isSearchTool(task.tool_name ? task.tool_name : null)) {
      executeTask(task);
    } else {
      if (task && task.tool_name && task.objective_id && task.tool_input) {
        const objective = await getObjectiveById(task.objective_id);
        if (!objective || !objective.session_id) {
          console.log("Objective not found");
          return;
        }
        const session = await getSessionById(objective.session_id);
        if (!session || !session.user_id || !session.id) {
          console.log("Session not found");
          return;
        }
        logInfo(`Executing task: ${JSON.stringify(task)}`);
        const allToolsAvailable = getToolByNames(allTools);

        const selectedTool = allToolsAvailable[task.tool_name];
        console.log("selectedTool", selectedTool);
        updateTaskById(task.id, {
          started_eval_at: new Date().toISOString(),
        });
        const { output } = await allToolsAvailable[task.tool_name].use(
          session.user_id,
          session.id,
          task.tool_input
        );
        console.log("output", output);

        updateTaskById(task.id, {
          tool_output: output,
          completed_at: new Date().toISOString(),
        });
      }

      // Completes all the outstanding tasks - good for reseting the database
      await updateTaskById(task.id, {
        completed_at: new Date().toISOString(),
      });
    }
  }
}
