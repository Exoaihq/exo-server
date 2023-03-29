import { Request, Response } from "express";
import { checkSessionOrThrow } from "../supabase.service";
import {
  createMessageWithUser,
  getMessagesByUserAndSession,
  getMessagesWithUser,
} from "./message.service";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const messages = await getMessagesByUserAndSession(
      session.data.user,
      sessionId
    );

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

    const response = await createMessageWithUser(
      session.data.user,
      req.body.message,
      req.body.sessionId
    );

    return res.status(200).json({
      data: response.data,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
