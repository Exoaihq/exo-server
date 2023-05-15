import { Request, Response } from "express";
import { createAiWritenCode } from "../aiCreatedCode/aiCreatedCode.repository";
import { updateFileById } from "../codeFile/codeFile.repository";
import { findOrUpdateAccount } from "../supabase/account.service";
import { checkSessionOrThrow } from "../session/session.service";

export const updateExoConfig = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const account = await findOrUpdateAccount(user.id);

    const { exoConfig, fileId } = req.body;

    const file = await updateFileById(fileId, {
      content: JSON.stringify(exoConfig),
      updated_at: new Date().toISOString(),
    });

    // Create the ai written code will update the file in the users repo next time they login to the app
    await createAiWritenCode({
      account_id: account.id,
      location: "existingFile",
      completed_at: new Date().toISOString(),
      path: file?.file_path || "",
      file_name: file?.file_name,
      code: JSON.stringify(exoConfig),
    });

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
