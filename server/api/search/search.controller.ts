import { Request, Response } from "express";
import { findOrUpdateAccount } from "../supabase/account.service";
import { checkSessionOrThrow } from "../supabase/supabase.service";
import { findCodeByQuery } from "./search.service";

export const searchCode = async (req: Request, res: Response) => {
  try {
    const session = await checkSessionOrThrow(req, res);

    const { user } = session.data;

    const { search } = req.body;

    const account = await findOrUpdateAccount(user.id);
    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const response = await findCodeByQuery(search, account.id);

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
