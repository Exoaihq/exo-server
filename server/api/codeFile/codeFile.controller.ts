import { Request, Response } from "express";
import { rootProjectDirectory } from "../../../utils/envVariable";
import { iterateOverFolderAndHandleAndUpdateFileContents } from "../../../utils/iterateOverFolders";
import { parseCode } from "../../../utils/treeSitter";
import { createEmbeddings } from "../openAi/openai.service";
import {
  addCodeToSupabase,
  findFileByExplainationEmbedding,
} from "../supabase/supabase.service";

export const findCodeFile = async (req: Request, res: Response) => {
  try {
    const query = "I need to find the files that handle command line loading";

    const queryEmbedding = await createEmbeddings([query]);

    const response = await findFileByExplainationEmbedding(queryEmbedding);

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const findAndUpdateFiles = async (req: Request, res: Response) => {
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
