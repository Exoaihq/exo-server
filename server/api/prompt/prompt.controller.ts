// ```javascript
import { Request, Response } from "express";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import {
  getGlobalPromptsDb,
  getPromptById,
  handleUsingSelectedPrompt,
} from "./prompt.service";

export const getGlobalPrompts = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const account = await findOrUpdateAccount(user);
    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const response = await getGlobalPromptsDb();

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const handleSelectedPrompt = async (req: Request, res: Response) => {
  try {
    const { promptId, sessionId } = req.body;
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const dbSession = await findOrCreateSession(user, sessionId);

    const prompt = await getPromptById(promptId);

    if (!prompt) {
      return res.status(404).json({ message: "Can't find the prompt" });
    }

    await handleUsingSelectedPrompt(dbSession, sessionId, user, prompt);

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
