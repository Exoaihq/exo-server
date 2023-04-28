import { Request, Response } from "express";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import {
  getAiCodeBySessionOrAccount,
  updateAiWritenCode,
} from "./aiCreatedCode.repository";

export const getAiCompletedCode = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

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

export const updateAiCompletedCode = async (req: Request, res: Response) => {
  try {
    const { values, id, sessionId } = req.body;
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    await findOrCreateSession(user.id, sessionId);

    await updateAiWritenCode(id, { ...values });

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
