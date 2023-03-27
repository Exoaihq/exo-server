import { createClient, PostgrestSingleResponse } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const getMessagesWithUser = async (
  user: Database["public"]["Tables"]["users"]["Row"]
): Promise<Database["public"]["Tables"]["messages"]["Row"][]> => {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("user_id", user.id);

  return data || [];
};

export const createMessagesWithUser = async (
  user: Database["public"]["Tables"]["users"]["Row"],
  message: Database["public"]["Tables"]["messages"]["Insert"],
  sessionId: string
): Promise<PostgrestSingleResponse<null>> => {
  message.user_id = user.id;
  message.session_id = sessionId;

  const res = await supabase
    .from("messages")
    // @ts-ignore
    .insert([message]);
  console.log(res);

  return res;
};
