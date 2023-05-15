import { NextFunction, Request, Response } from "express";
import { checkSessionOrThrow } from "../api/session/session.service";
import {
  setSupabaseAuthenticatedServerClient,
  supabaseAuthenticatedServerClient,
} from "../api/supabase/supabase.service";

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

    await setSupabaseAuthenticatedServerClient(
      session.data.session.refresh_token,
      session.data.session.access_token
    );

    if (!supabaseAuthenticatedServerClient) {
      throw new Error("Unable to create authenticated supabase client");
    }

    return next();
  } catch (error: any) {
    return res
      .status(403)
      .json({ message: "You have to be logged in to do that" });
  }
}
