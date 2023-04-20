import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";

import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const getTasksBySession = async (
  sessionId: string
): Promise<Partial<Database["public"]["Tables"]["task"]["Row"]>[] | []> => {
  const { data, error } = await supabase
    .from("short_term_task")
    .select("*")
    .order("created_at", { ascending: false })
    .eq("session_id", sessionId);

  if (error || !data) {
    console.log("Error getting tasks", error);
    return [];
  }
  console.log(data);

  return data || [];
};

export const createTaskWithObjective = async (
  task: Database["public"]["Tables"]["task"]["Insert"],
  objectiveId: string
): Promise<any | null> => {
  task["objective_id"] = objectiveId;

  const { data, error } = await supabase
    .from("task")
    .insert([task])
    .select("*");

  if (error || !data || data.length === 0) {
    console.log("Error creating task", error);
    return null;
  }

  return data[0];
};

export const getTaskById = async (
  id: string
): Promise<Partial<Database["public"]["Tables"]["task"]["Row"]> | null> => {
  const { data, error } = await supabase
    .from("short_term_task")
    .select("*")
    .order("created_at", { ascending: false })
    .eq("id", id);

  if (error || !data) {
    console.log("Error getting tasks", error);
    return null;
  }
  console.log(data);

  return data[0] || [];
};
