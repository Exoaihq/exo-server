import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { findOrUpdateAccount } from "../supabase/account.service";
import { getSessionById } from "../session/session.repository";

export const sessionCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req;

    const { session } = req.body;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    const account = await findOrUpdateAccount(userId);
    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const response = await getSessionById(sessionId);

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(405).json({ message: error.message });
  }
};
