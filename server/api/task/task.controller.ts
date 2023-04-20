import { Request, Response } from "express";
import { checkSessionOrThrow } from "../supabase/supabase.service";
import { getTasksBySession } from "./task.service";

export const getTasks = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

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

// export const createTask = async (req: Request, res: Response) => {
//   try {
//     const session = await checkSessionOrThrow(req, res);

//     const { session_id } = req.headers;

//     const sessionId = session_id as string;

//     const response = await createObjectiveWithSession(req.body.task, sessionId);

//     if (!response) {
//       return res.status(404).json({ message: "Error creating message" });
//     }

//     return res.status(200).json({
//       data: response,
//     });
//   } catch (error: any) {
//     res.status(500).json({ message: error.message });
//   }
// };
