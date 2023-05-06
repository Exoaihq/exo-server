import { Request, Response } from "express";
import { getTasksBySession, updateTaskById } from "./task.repository";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";

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
