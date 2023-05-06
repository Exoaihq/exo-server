import { Request, Response } from "express";
import {
  getIncompleteTasks,
  getTaskById,
  getTasksBySession,
  updateTaskById,
} from "./task.repository";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { executeTask } from "../agent/agent.act";

export const getTasks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const tasks = await getTasksBySession(sessionId);

    return res.status(200).json({
      data: tasks,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { taskId, values } = req.body;

    await updateTaskById(taskId, values);

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const testTasks = async (req: Request, res: Response) => {
  try {
    const userId = "4ff416c9-4805-4adb-bfe7-ef315ae9536b";

    const sessionId = "ad536466-86b0-4f6c-8c40-2118a30a68e1";

    // console.log("Getting tasks");
    // const tasks = await getIncompleteTasks();
    const task = await getTaskById("838098d8-bc7e-4221-8867-5cf0e2c4f13f");

    let tasks;
    if (task) {
      tasks = await executeTask(task);
    }

    return res.status(200).json({
      data: tasks,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
