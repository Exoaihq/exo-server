import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/isAuthenticated";

export const acceptWebhook = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  try {
    console.log(req.body);

    res.status(200).json({ data: "Ok" });
  } catch (error: any) {
    res.status(405).json({ message: error.message });
  }
};
