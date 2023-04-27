import { Request, Response } from "express";
import { ParseCode } from "../../../types/parseCode.types";
import { rootProjectDirectory } from "../../../utils/envVariable";
import { iterateOverFolderAndHandleAndUpdateFileContents } from "../../../utils/iterateOverFolders";
import { parseCode } from "../../../utils/treeSitter";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";
import { addCodeToSupabase } from "../codeSnippet/codeSnippet.repository";

import {
  createMessageWithUser,
  getOnlyRoleAndContentMessagesByUserAndSession,
} from "../message/message.service";
import { findCodeByQuery } from "../search/search.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import {
  checkSessionOrThrow,
  findOrCreateSession,
} from "../supabase/supabase.service";
import { handleAndFilesToDb } from "./codeFile.service";
import {
  checkDbSession,
  handleFileUploadWithSession,
} from "../codeCompletion/codeCompletion.service";

export const findCodeFile = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { query } = req.body;

    const account = await findOrUpdateAccount(user.id);
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
  directoryId: number;
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

    await findOrCreateSession(user.id, sessionId);

    const account = await findOrUpdateAccount(user.id);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const { files, directoryId } = req.body as CreateFilesRequest;

    handleAndFilesToDb(files, account, directoryId);

    // if (directoryId) {
    //   await createMessageWithUser(
    //     user.id,
    //     {
    //       content: `Started indexing your directroy. This may take a while. The directory indexed date will be updated when the indexing is completed.`,
    //       role: "assistant",
    //     },
    //     sessionId
    //   );
    // }

    return res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const handleFileUpload = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { fullFilePathWithName, sessionId, codeContent } =
      req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      user.id,
      sessionId
    );
    const dbSession = await findOrCreateSession(user.id, sessionId);

    const response = await handleFileUploadWithSession(
      sessionMessages,
      fullFilePathWithName,
      user.id,
      sessionId,
      codeContent,
      dbSession
    );

    return res.status(200).json({
      data: response,
    });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
