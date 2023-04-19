import { Request, Response } from "express";
import { checkSessionOrThrow } from "../supabase/supabase.service";
import {
  createMemoryWithSession,
  getMemoriesBySession,
} from "./memory.service";

export const getMemories = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const memories = await getMemoriesBySession(sessionId);

    return res.status(200).json({
      data: memories,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMemory = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const response = await createMemoryWithSession(req.body.memory, sessionId);

    if (!response) {
      return res.status(404).json({ message: "Error creating message" });
    }

    return res.status(200).json({
      data: response,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
