import { Request, Response } from "express";
import { checkSessionOrThrow } from "../supabase/supabase.service";
import {
  createMessageWithUser,
  findUnseenHelperMessages,
  getMessagesByUserAndSession,
} from "./message.service";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);
    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findUnseenHelperMessages(user.id, sessionId);

    const messages = await getMessagesByUserAndSession(user.id, sessionId);

    return res.status(200).json({
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMessages = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);
    const { user } = session.data;

    const response = await createMessageWithUser(
      user.id,
      req.body.message,
      req.body.sessionId
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
