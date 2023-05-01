import { Request, Response } from "express";
import { updateAiCompletedCode } from "../aiCreatedCode/aiCreatedCode.controller";
import { createAiWritenCode } from "../aiCreatedCode/aiCreatedCode.repository";
import { updateSnippetById } from "../codeSnippet/codeSnippet.repository";
import { findOrUpdateAccount } from "../supabase/account.service";
import { checkSessionOrThrow } from "../supabase/supabase.service";

export const updateExoConfig = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const account = await findOrUpdateAccount(user.id);

    const { exoConfig, sessionId, snippetId } = req.body;

    const snippet = await updateSnippetById(snippetId, {
      code_string: JSON.stringify(exoConfig),
      updated_at: new Date().toISOString(),
    });

    // Create the ai written code will update the file in the users repo next time they login to the app
    await createAiWritenCode({
      account_id: account.id,
      location: "existingFile",
      completed_at: new Date().toISOString(),
      path: snippet?.relative_file_path || "",
      file_name: snippet?.file_name,
      code: JSON.stringify(exoConfig),
    });

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
