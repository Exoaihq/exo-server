import { NextFunction, Request, Response } from "express";
import { checkSessionOrThrow } from "../api/supabase/supabase.service";

export type AuthenticatedRequest = Request & Record<string, any>;

export async function ensureAuthenticated(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await checkSessionOrThrow(req, res);
    req.session = session.data.session.access_token;
    req.userId = session.data.user.id;
    return next();
  } catch (error: any) {
    return res
      .status(403)
      .json({ message: "You have to be logged in to do that" });
  }
}
