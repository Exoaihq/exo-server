import { createClient } from "@supabase/supabase-js";
import { Request, Response } from "express";
import {
  rootProjectDirectory,
  supabaseKey,
  supabaseUrl,
} from "../../../utils/envVariable";
import { createCodeCompletionAddToFiles } from "../../../utils/generateCode";
import { extractFileNameAndPathFromFullPath } from "../../../utils/getFileName";
import {
  iterateOverFolder,
  iterateOverFolderAndHandleFile,
} from "../../../utils/iterateOverFolders";
import { findFilesWithoutExplaination } from "../codeFile/codeFile.repository";
import { createTextCompletion } from "../openAi/openai.service";
import {
  addFileToSupabase,
  assignCodeSnippetToFile,
  assignExplainationsForFilesWhereNull,
  findAllSnippetWithoutFiles,
} from "../supabase/supabase.service";
import {
  codeSnippetSearch,
  findSnippetsWithoutFilesAndAssignFiles,
} from "./codeSnippet.service";

// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey);

export const helloWorld = async (req: Request, res: Response) => {
  try {
    const hello = "Hello, this is Express + asdfsadasdfasdfasdfsadfasdfsadfdsa";
    res.status(200).json({ hello });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getCodeSnippet = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("code_snippet").select("*");
    console.log(data, error);

    const codeSnippet =
      "Hello, this is Express + asdfsadasdfasdfasdfsadfasdfsadfdsa";
    res.status(200).json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const testCodeNodeParsing = async (req: Request, res: Response) => {
  try {
    async function findFiles(directory: string) {
      const { data, error } = await supabase
        .from("code_snippet")
        .select("code_explaination")
        .eq("relative_file_path", directory);
      if (data && data[0]) {
        const codeExplaination = data[0].code_explaination;
        console.log(codeExplaination.trim());
      }
    }

    function handleFile(file: string) {
      console.log(file);
    }

    const directory = rootProjectDirectory + "/server";

    const output = iterateOverFolder(directory, findFiles);

    // const path = "/Users/kg/Repos/code-gen-server/server/api/codeSnippet/codeSnippert.controller.ts"

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const testGpt4 = async (req: Request, res: Response) => {
  try {
    const prompt =
      "Write a typescript function that creates a loading elipsis with three dots and cycles through them every second. The function should take a string as an argument and return the loading elipsis as a string.";

    const response = await createTextCompletion(prompt, 1, "Loading", "chat");
    console.log(response);

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const searchCodeEmbeddings = async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    const data = await codeSnippetSearch(code);

    res.status(200).json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const generateCode = async (req: Request, res: Response) => {
  try {
    const prompt = "Can you create a typescript react login page.";

    const response = await createCodeCompletionAddToFiles(
      prompt,
      "Loading",
      "/Users/kg/Repos/code-gen-app/"
    );
    console.log(response);

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const assignSnippetToFile = async (req: Request, res: Response) => {
  try {
    //file name = generateCode.ts
    const response = await assignCodeSnippetToFile(176, 87);

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const findAllSnippetsWithoutFiles = async (
  req: Request,
  res: Response
) => {
  try {
    //file name = generateCode.ts
    const response = await findAllSnippetWithoutFiles();

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const findAllSnippetsWithoutFilesAndAssign = async (
  req: Request,
  res: Response
) => {
  try {
    //file name = generateCode.ts
    const response = await findSnippetsWithoutFilesAndAssignFiles();

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const findAllFilesWithoutExplainations = async (
  req: Request,
  res: Response
) => {
  try {
    //file name = generateCode.ts
    const response = await findFilesWithoutExplaination();

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const findAllFilesWithoutExplainationsAndAddThem = async (
  req: Request,
  res: Response
) => {
  try {
    //file name = generateCode.ts
    const response = await findFilesWithoutExplaination();
    console.log(response);
    // @ts-ignore
    const assign = assignExplainationsForFilesWhereNull(response);

    res.status(200).json({ data: "done" });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
