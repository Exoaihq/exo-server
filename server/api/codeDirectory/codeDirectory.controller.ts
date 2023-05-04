import { Response } from "express";
import { getDirectoryNameFromPath } from "../../../utils/getFileName";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { ExpectedNextAction } from "../codeCompletion/scenerios/codeCompletion.knownNextAction";
import { findExoConfigFileByCodeDirectoryId } from "../codeFile/codeFile.repository";
import { createMessageWithUser } from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
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
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(userId, sessionId);

    const account = await findOrUpdateAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const directories = await getCodeDirectories(account.id);

    if (!directories) {
      return res.status(404).json({ message: "Can't find the directories" });
    }

    let directoryWithExoConfig = [];
    for await (const directory of directories) {
      const exoConfig = await findExoConfigFileByCodeDirectoryId(directory.id);
      if (!exoConfig) {
        directoryWithExoConfig.push({ ...directory });
      } else {
        directoryWithExoConfig.push({
          ...directory,
          exoConfig: { ...exoConfig },
        });
      }
    }

    return res.status(200).json({
      data: directoryWithExoConfig,
      // @ts-ignore
      metadata: getDirectoryFilesAndSnippetCount(directories),
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

export const createDirectoryByAccount = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { directory } = req.body;
    const { userId } = req;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(userId, sessionId);

    const account = await findOrUpdateAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const directories = await createCodeDirectoryByUser(
      userId,
      directory,
      getDirectoryNameFromPath(directory),
      true
    );

    await createMessageWithUser(
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

export const setDirectoryToAddFile = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { directory } = req.body;
    const { userId } = req;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(userId, sessionId);

    const account = await findOrUpdateAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    await updateSession(userId, sessionId, {
      location: "newFile",
      new_file: true,
      file_path: directory,
      expected_next_action: ExpectedNextAction.NEW_FILE,
    });

    const newMessage = await createMessageWithUser(
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

export const updateDirectory = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { directoryId, values } = req.body;
    const { userId } = req;

    const { session_id } = req.headers;

    const sessionId = session_id as string;

    await findOrCreateSession(userId, sessionId);

    const account = await findOrUpdateAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    await updateCodeDirectoryById(directoryId, values);

    await createMessageWithUser(
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
