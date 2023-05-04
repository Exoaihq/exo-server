import { Response } from "express";
import { ParseCode } from "../../../types/parseCode.types";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";

import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { handleFileUploadWithSession } from "../codeCompletion/codeCompletion.service";
import { getOnlyRoleAndContentMessagesByUserAndSession } from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import { findOrCreateSession } from "../supabase/supabase.service";
import { handleAndFilesToDb } from "./codeFile.service";

export interface CreateFilesRequest {
  files: ParseCode[];
  directoryId: number;
  baseApiUrl: string;
  session: any;
  sessionId: string;
}

export const findAndUpdateFilesFromClient = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req;

    const account = await findOrUpdateAccount(userId);

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

export const handleFileUpload = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req;

    const { fullFilePathWithName, sessionId, codeContent } =
      req.body as CodeCompletionRequest;

    const sessionMessages = await getOnlyRoleAndContentMessagesByUserAndSession(
      userId,
      sessionId
    );
    const dbSession = await findOrCreateSession(userId, sessionId);

    const response = await handleFileUploadWithSession(
      sessionMessages,
      fullFilePathWithName,
      userId,
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
