import { Database } from "../../../types/supabase";
import { supabase } from "../../../server";
import { ObjectiveWithTasks } from "./objective.types";
import { logError } from "../../../utils/commandLineColors";

export const getObjectivesBySession = async (
  sessionId: string
): Promise<
  Partial<Database["public"]["Tables"]["objective"]["Row"]>[] | []
> => {
  const { data, error } = await supabase
    .from("short_term_objective")
    .select("*")
    .order("created_at", { ascending: false })
    .eq("session_id", sessionId);

  if (error || !data) {
    console.log("Error getting objectives", error);
    return [];
  }
  console.log(data);

  return data || [];
};

export const createObjectiveWithSession = async (
  objective: Database["public"]["Tables"]["objective"]["Insert"],
  sessionId: string
): Promise<any | null> => {
  objective["session_id"] = sessionId;

  const { data, error } = await supabase
    .from("objective")
    // @ts-ignore
    .insert([objective])
    .select("*");

  if (error || !data || data.length === 0) {
    console.log("Error creating objective", error);
    return null;
  }

  return data[0];
};

export const getObjectiveById = async (
  id: string
): Promise<ObjectiveWithTasks | null> => {
  const { data, error } = await supabase
    .from("objective")
    .select("*, task(*)")
    .order("created_at", { ascending: false })
    .eq("id", id);

  if (error || !data || data.length === 0) {
    logError(`Error getting objectives: ${error?.message}`);
    return null;
  }
  console.log(data);

  return (data[0] as ObjectiveWithTasks) || null;
};
