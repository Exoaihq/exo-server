import { Request, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import {
  createMessageWithUser,
  findUnseenHelperMessages,
  getMessagesByUserAndSession,
} from "./message.service";

export const getMessages = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findUnseenHelperMessages(userId, sessionId);

    const messages = await getMessagesByUserAndSession(sessionId);

    return res.status(200).json({
      data: messages,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const createMessages = async (req: Request, res: Response) => {
  try {
    const response = await createMessageWithUser(
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
