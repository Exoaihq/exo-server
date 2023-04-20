import { Request, Response } from "express";
import { getDirectoryNameFromPath } from "../../../utils/getFileName";
import { ExpectedNextAction } from "../codeCompletion/scenerios/codeCompletion.knownNextAction";
import { createMessageWithUser } from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
  updateSession,
} from "../supabase/supabase.service";
import {
  createCodeDirectoryByUser,
  getCodeDirectories,
  updateCodeDirectoryById,
} from "./codeDirectory.repository";
import { getDirectoryFilesAndSnippetCount } from "./codeDirectory.service";

export const getCodeDirectoriesByAccount = async (
  req: Request,
  res: Response
) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const directories = (await getCodeDirectories(account.id)) || [];

    return res.status(200).json({
      data: directories,
      metadata: getDirectoryFilesAndSnippetCount(directories),
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

    await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const directories = await createCodeDirectoryByUser(
      user.id,
      directory,
      getDirectoryNameFromPath(directory),
      true
    );

    await createMessageWithUser(
      user.id,
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

    await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    await updateSession(user.id, sessionId, {
      location: "newFile",
      new_file: true,
      file_path: directory,
      expected_next_action: ExpectedNextAction.NEW_FILE,
    });

    const newMessage = await createMessageWithUser(
      user.id,
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

export const updateDirectory = async (req: Request, res: Response) => {
  try {
    const { directoryId, values } = req.body;
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    await updateCodeDirectoryById(directoryId, values);

    await createMessageWithUser(
      user.id,
      {
        content: `Ok I removed the directory from your saved directories`,
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
