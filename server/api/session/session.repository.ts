import { supabaseBaseServerClient } from "../../../server";
import { Database } from "../../../types/supabase";
import { logError } from "../../../utils/commandLineColors";
import { authenticatedSupabaseClient } from "../supabase/supabase.service";
import { SessionJustId } from "./session.type";

export const getSessionById = async (
  sessionId: string
): Promise<Database["public"]["Tables"]["session"]["Row"]> => {
  const { data, error } = await authenticatedSupabaseClient()
    .from("session")
    .select("*")
    .eq("id", sessionId);

  if (error || !data || data.length === 0) {
    throw new Error("Can't find the users session");
  }

  return data[0];
};

// Most entities have a session id that ties them to a user. This gets all the sessions for a user so you can find all the entities for a user. For example find all messages for a user.
export const getSessionsByUserId = async (
  userId: string
): Promise<SessionJustId[]> => {
  const { data, error } = await authenticatedSupabaseClient()
    .from("session")
    .select("id")
    .eq("user_id", userId);

  if (error || !data || data.length === 0) {
    throw new Error("Can't find the users session");
  }

  return data;
};

export const updateSession = async (
  userId: string,
  sessionId: string,
  session: Partial<Database["public"]["Tables"]["session"]["Update"]>
): Promise<any> => {
  const { data, error } = await authenticatedSupabaseClient()
    .from("session")
    .update({ ...session })
    .eq("user_id", userId)
    .eq("id", sessionId)
    .select();

  if (error || !data || data.length === 0) {
    logError("Can't find the users session");
  }

  return data;
};

export async function checkSession(session: {
  access_token: string;
  refresh_token: string;
}) {
  return await supabaseBaseServerClient.auth.setSession(session);
}
