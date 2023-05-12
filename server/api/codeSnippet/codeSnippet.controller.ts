import { Request, Response } from "express";
import { supabaseBaseServerClient } from "../../../server";

export const getCodeSnippets = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseBaseServerClient
      .from("code_snippet")
      .select("*");

    res.status(200).json({ data });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
