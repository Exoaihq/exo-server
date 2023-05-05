import { logInfo } from "../../../utils/commandLineColors";
import { getCompletedTasks, updateTaskById } from "../task/task.repository";
import { TaskWithObjective } from "../task/task.types";
import { handleLoopAgent } from "./autoAgents/handleLoopAgent";
import { ToolName } from "./tools";

export function isSearchTool(taskName: string | null) {
  if (!taskName) return false;
  if (
    taskName === ToolName.searchCode ||
    taskName === ToolName.searchDirectory ||
    taskName === ToolName.searchFiles ||
    taskName === ToolName.searchTests
  )
    return true;
  return false;
}

export function isGenerateCodeTool(task: TaskWithObjective) {
  if (!task) return false;
  if (
    task?.tool_name === ToolName.generateNewCode ||
    task.tool_name === ToolName.generateTestCode ||
    task.tool_name === ToolName.getExisitingCode
  )
    return true;
  return false;
}

export async function findCompletedTasksAndAskUserForInput() {
  const completed = await getCompletedTasks();
  logInfo(`Tasks with output count: ${completed.length}`);

  if (completed.length === 0) return;
  for (let task of completed) {
    await updateTaskById(task.id, {
      loop_evaluated_at: new Date().toISOString(),
    });
    if (isSearchTool(task.tool_name)) {
      const otherTasks = task?.objective?.task;
      if (otherTasks.length === 0) {
        logInfo("No other tasks");
        continue;
      } else {
        const found = otherTasks.find((task: any) => isGenerateCodeTool(task));
        if (!found || !found.tool_name) {
          logInfo("No generate code tool");
          continue;
        } else {
          // Loop agent will check if there are multiple files or code to create and then create the tasks
          await handleLoopAgent(task, found);
        }
      }
    }
  }
}
