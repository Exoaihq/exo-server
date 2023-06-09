import { Response } from "express";
import { ParseCode } from "../../../types/parseCode.types";
import { CodeCompletionRequest } from "../codeCompletion/codeCompletion.types";

import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { handleFileUploadWithSession } from "../codeCompletion/codeCompletion.service";
import { getOnlyRoleAndContentMessagesByUserAndSession } from "../message/message.service";
import { findOrUpdateAccount } from "../supabase/account.service";
import { findOrCreateSession } from "../session/session.service";
import {
  findDeletedFiles,
  findDuplicateFiles,
  handleAndFilesToDb,
  writeTestsForFiles,
} from "./codeFile.service";
import {
  deleteMulipleFilesById,
  findFilesByDirectoryId,
} from "./codeFile.repository";
import { logInfo } from "../../../utils/commandLineColors";

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

    // const dbFiles = await findFilesByDirectoryId(directoryId);
    // if (dbFiles) {
    //   logInfo(`DB Files ${dbFiles.length}`);
    //   logInfo(`Client Files ${files.length}`);

    //   const duplicateFiles = findDuplicateFiles(dbFiles);

    //   if (duplicateFiles && duplicateFiles.duplicateCount > 0) {
    //     deleteMulipleFilesById(
    //       duplicateFiles.duplicateFilePairs.map((f) => f?.oldestFile?.id)
    //     );
    //   }

    //   const deletedFiles = findDeletedFiles(files, dbFiles);
    //   if (deletedFiles.length > 0) {
    //     deleteMulipleFilesById(deletedFiles.map((f) => f.id));
    //   }
    // }

    handleAndFilesToDb(files, account, directoryId);

    return res.status(200).json({ data: files });
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

export interface WriteTestRequest {
  files: ParseCode[];
  directoryPath: string;
  baseApiUrl: string;
  session: any;
  sessionId: string;
}

export const handleWriteTests = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    const { userId } = req;

    const { directoryPath, sessionId, files } = req.body as WriteTestRequest;

    const account = await findOrUpdateAccount(userId);

    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const response = await writeTestsForFiles(
      files,
      directoryPath,
      account.id,
      userId,
      sessionId
    );

    return res.status(200).json({
      data: response,
    });
  } catch (error: any) {
    console.log(error);
    res.status(405).json({ message: error.message });
  }
};
