import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";
import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";

// Create a single supabase client for interacting with your database
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const findOrUpdateAccount = async (
  user: Database["public"]["Tables"]["users"]["Row"]
): Promise<Database["public"]["Tables"]["account"]["Row"] | null> => {
  const { data, error } = await supabase
    .from("account")
    .select("*")
    .eq("user_id", user.id)
    .select();

  if (error) {
    console.log("finding account error", error);
  }

  if (data && data.length > 0) {
    return data[0];
  } else {
    const { data, error } = await supabase
      .from("account")
      .insert([{ user_id: user.id }])
      .select();

    if (!data || !data[0]) {
      console.log("Error creating session for user: ", user.id);
      return null;
    } else {
      return data[0] as Database["public"]["Tables"]["account"]["Row"];
    }
  }
};
