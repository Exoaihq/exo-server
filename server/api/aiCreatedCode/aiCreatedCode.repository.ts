import { Database } from "../../../types/supabase";
import { supabase } from "../../../server";

export const getAiCodeBySessionOrAccount = async (
  sessionId: string,
  accountId?: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"][]> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .or(`session_id.eq.${sessionId},account_id.eq.${accountId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code error", error);
    return [];
  }

  return data as Database["public"]["Tables"]["ai_created_code"]["Row"][];
};

export const findAiCodeBySessionAndFileName = async (
  sessionId: string,
  fileName: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"] | null> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .eq("session_id", sessionId)
    .eq("file_name", fileName)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) {
    console.log("Getting ai generated by session and file name error", error);
    return null;
  }

  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const getAiCodeBySessionCodeNotNull = async (
  sessionId: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .eq("session_id", sessionId)
    .not("code", "is", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.log("Getting code error", error);
  }

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const findOrCreateAiWritenCode = async (
  sessionId: string,
  values?: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .select("*")
    .eq("session_id", sessionId);

  if (data) {
    console.log("Write code object found. ID:", data && data[0] && data[0].id);
  }

  // Create a new object if the object was already created
  if (data && data.length > 0 && data[0] && !data[0].completed_at) {
    return data[0];
  } else {
    const { data } = await supabase
      .from("ai_created_code")
      .insert([{ session_id: sessionId, ...values }])
      .select();

    // @ts-ignore
    return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
  }
};

export const createAiWritenCode = async (
  values: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data } = await supabase
    .from("ai_created_code")
    .insert([{ ...values }])
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const createAiWritenCodeWithSessionLocationAndCode = async (
  sessionId: string,
  code: string,
  location: string
): Promise<Database["public"]["Tables"]["ai_created_code"]["Row"]> => {
  const { data } = await supabase
    .from("ai_created_code")
    .insert([{ code, session_id: sessionId, location }])
    .select();

  // @ts-ignore
  return data[0] as Database["public"]["Tables"]["ai_created_code"]["Row"];
};

export const updateAiWritenCode = async (
  id: string,
  values?: Partial<Database["public"]["Tables"]["ai_created_code"]["Update"]>
): Promise<void> => {
  const { data, error } = await supabase
    .from("ai_created_code")
    .update({ ...values })
    .eq("id", id);

  console.log("Updated code", data, error);
};
