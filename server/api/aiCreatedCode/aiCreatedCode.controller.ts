import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { findOrUpdateAccount } from "../supabase/account.service";
import { findOrCreateSession } from "../supabase/supabase.service";
import {
  getAiCodeBySessionOrAccount,
  updateAiWritenCode,
} from "./aiCreatedCode.repository";

export const getAiCompletedCode = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(userId, sessionId);

    const account = await findOrUpdateAccount(userId);

    const aiCreatedCode = await getAiCodeBySessionOrAccount(
      sessionId,
      account.id
    );

    return res.status(200).json({
      data: [...aiCreatedCode],
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const updateAiCompletedCode = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { values, id, sessionId } = req.body;
    const { userId } = req;

    await findOrCreateSession(userId, sessionId);

    await updateAiWritenCode(id, { ...values });

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
