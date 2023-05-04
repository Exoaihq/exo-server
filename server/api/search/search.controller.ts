import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";
import { findOrUpdateAccount } from "../supabase/account.service";
import { findCodeByQuery } from "./search.service";

export const searchCode = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req;

    const { search } = req.body;

    const account = await findOrUpdateAccount(userId);
    if (!account) {
      return res.status(404).json({ message: "Can't find the user account" });
    }

    const response = await findCodeByQuery(search, account.id);

    res.status(200).json({ data: response });
  } catch (error: any) {
    res.status(405).json({ message: error.message });
  }
};
