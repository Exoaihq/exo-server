import { supabaseBaseServerClient } from "../../../server";
import { Database } from "../../../types/supabase";

export const findOrUpdateAccount = async (
  userId: string
): Promise<Database["public"]["Tables"]["account"]["Row"]> => {
  const { data, error } = await supabaseBaseServerClient
    .from("account")
    .select("*")
    .eq("user_id", userId)
    .select();

  if (error) {
    console.log("finding account error", error);
  }

  if (data && data.length > 0) {
    return data[0];
  } else {
    const { data, error } = await supabaseBaseServerClient
      .from("account")
      .insert([{ user_id: userId }])
      .select();

    if (!data || !data[0]) {
      console.log("Error creating session for user: ", userId);
      throw new Error("Error creating account for user: " + userId);
    } else {
      return data[0] as Database["public"]["Tables"]["account"]["Row"];
    }
  }
};
