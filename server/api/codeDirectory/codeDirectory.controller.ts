import { Request, Response } from "express";
import { getDirectoryNameFromPath } from "../../../utils/getFileName";
import { createMessageWithUser } from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
  updateSession,
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

    await findOrCreateSession(user, sessionId);

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

    await findOrCreateSession(user, sessionId);

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

    await createMessageWithUser(
      user,
      {
        content: `Created directory ${directory}. You can now index the files in this directory by clicking the "Index" button in the Saved Repos section. Then you can search and update the files in this directory!`,
        role: "assistant",
      },
      sessionId
    );

    return res.status(200).json({
      data: directories,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const setDirectoryToAddFile = async (req: Request, res: Response) => {
  try {
    const { directory } = req.body;
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(user, sessionId);

    const account = await findOrUpdateAccount(user);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    await updateSession(user, sessionId, {
      location: "newFile",
      new_file: true,
      file_path: directory,
      expected_next_action: "User to send functionality and file name",
    });

    await createMessageWithUser(
      user,
      {
        content: `Ok I set the directory: ${directory} as the location to add a new file. Let me know what functionality and file name you want to add to the new file and ill create it and add it to the directory.`,
        role: "assistant",
      },
      sessionId
    );

    return res.status(200).json({
      data: "done",
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
