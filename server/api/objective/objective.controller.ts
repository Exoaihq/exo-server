import { Request, Response } from "express";
import { checkSessionOrThrow } from "../supabase/supabase.service";
import {
  createObjectiveWithSession,
  getObjectivesBySession,
} from "./objective.service";

export const getObjectives = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const objectives = await getObjectivesBySession(sessionId);

    return res.status(200).json({
      data: objectives,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createObjective = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const response = await createObjectiveWithSession(
      req.body.objective,
      sessionId
    );

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
