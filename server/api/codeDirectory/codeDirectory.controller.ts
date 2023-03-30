import { Request, Response } from "express";
import { getDirectoryNameFromPath } from "../../../utils/getFileName";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrUpdateSession,
} from "../supabase/supabase.service";
import {
  createCodeDirectory,
  getCodeDirectories,
} from "./codeDirectory.service";

export const getCodeDirectoriesByAccount = async (
  req: Request,
  res: Response
) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrUpdateSession(user, sessionId);

    const account = await findOrUpdateAccount(user);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const directories = await getCodeDirectories(account.id);

    return res.status(200).json({
      data: directories,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createDirectoryByAccount = async (req: Request, res: Response) => {
  try {
    const { directory } = req.body;
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrUpdateSession(user, sessionId);

    const account = await findOrUpdateAccount(user);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const directories = await createCodeDirectory(
      user,
      directory,
      getDirectoryNameFromPath(directory),
      true
    );

    return res.status(200).json({
      data: directories,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
