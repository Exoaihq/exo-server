import { Request, Response } from "express";
import { ParseCode } from "../../../types/parseCode.types";
import { rootProjectDirectory } from "../../../utils/envVariable";
import { iterateOverFolderAndHandleAndUpdateFileContents } from "../../../utils/iterateOverFolders";
import { parseCode } from "../../../utils/treeSitter";

import { createMessageWithUser } from "../message/message.service";
import { findCodeByQuery } from "../search/search.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  addCodeToSupabase,
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import { handleAndFilesToDb } from "./codeFile.service";

export const findCodeFile = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { query } = req.body;

    const account = await findOrUpdateAccount(user);
    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const response = await findCodeByQuery(query, account.id);

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const findAndUpdateFilesFromServerFileSys = async (
  req: Request,
  res: Response
) => {
  try {
    // /Users/kg/Repos/code-gen-server
    const serverDirectory = rootProjectDirectory;
    // code-gen-server
    const serverRoot = serverDirectory.split("/").pop();

    iterateOverFolderAndHandleAndUpdateFileContents(
      serverDirectory,
      parseCode,
      addCodeToSupabase,
      true
    );

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export interface CreateFilesRequest {
  files: ParseCode[];
  directoryId: string;
  baseApiUrl: string;
  session: any;
  sessionId: string;
}

export const findAndUpdateFilesFromClient = async (
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

    const { files, directoryId } = req.body as CreateFilesRequest;

    handleAndFilesToDb(directoryId, files, account);

    await createMessageWithUser(
      user,
      {
        content: `Started indexing your directroy. This may take a while. The directory indexed date will be updated when the indexing is completed.`,
        role: "assistant",
      },
      sessionId
    );

    return res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
