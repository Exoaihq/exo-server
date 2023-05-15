import { Request, Response } from "express";
import { Database } from "../../../types/supabase";
import {
  AuthResponseWithUser,
  authenticatedSupabaseClient,
  supabaseAuthenticatedServerClient,
} from "../supabase/supabase.service";
import { checkSession, updateSession } from "./session.repository";

export const resetSession = (userId: string, sessionId: any) => {
  updateSession(userId, sessionId, {
    code_content: "",
    file_name: "",
    file_path: "",
    new_file: null,
    location: "",
    expected_next_action: null,
  });
};

export async function checkSessionOrThrow(
  req: Request,
  res: Response
): Promise<AuthResponseWithUser> {
  const { access_token, refresh_token } = req.headers;

  if (!access_token || !refresh_token) {
    throw new Error("403");
  }

  const access = access_token as string;
  const refresh = refresh_token as string;

  const session = await checkSession({
    access_token: access,
    refresh_token: refresh,
  });

  if (
    !session ||
    !session.data ||
    !session.data.user ||
    !session.data.user.id ||
    session.error
  ) {
    throw new Error("403");
  }

  return session as AuthResponseWithUser;
}

export const findOrCreateSession = async (
  userId: string,
  sessionId: string
): Promise<Database["public"]["Tables"]["session"]["Row"]> => {
  if (!supabaseAuthenticatedServerClient) {
    throw new Error("No authenticated supabase client");
  }

  const { data, error } = await authenticatedSupabaseClient()
    .from("session")
    .select("*")
    .eq("user_id", userId)
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }

  if (data && data.length > 0) {
    return data[0];
  } else {
    const { data, error } = await authenticatedSupabaseClient()
      .from("session")
      .insert([{ user_id: userId, id: sessionId }])
      .select();

    if (error || !data) {
      throw new Error(error.message);
    }

    return data[0] as Database["public"]["Tables"]["session"]["Row"];
  }
};
