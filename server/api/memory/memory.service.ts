import { Database } from "../../../types/supabase";
import { supabase } from "../../../server";
import { createEmbeddings } from "../openAi/openAi.repository";

export const getMemoriesBySession = async (
  sessionId: string
): Promise<
  Partial<Database["public"]["Tables"]["short_term_memory"]["Row"]>[] | []
> => {
  const { data, error } = await supabase
    .from("short_term_memory")
    .select("id, memory_text, created_at, session_id, memory_context")
    .order("created_at", { ascending: false })
    .eq("session_id", sessionId);

  if (error || !data) {
    console.log("Error getting memories", error);
    return [];
  }
  console.log(data);

  return data || [];
};

export const createMemoryWithSession = async (
  memory: Database["public"]["Tables"]["short_term_memory"]["Insert"],
  sessionId: string
): Promise<any | null> => {
  memory["session_id"] = sessionId;

  if (memory.memory_text) {
    memory.memory_embedding = await createEmbeddings([memory.memory_text]);
  }

  const { data, error } = await supabase
    .from("short_term_memory")
    // @ts-ignore
    .insert([memory])
    .select("*");

  if (error || !data || data.length === 0) {
    console.log("Error creating memory", error);
    return null;
  }

  return data[0];
};

export const getMemoriesById = async (
  id: string
): Promise<Partial<
  Database["public"]["Tables"]["short_term_memory"]["Row"]
> | null> => {
  const { data, error } = await supabase
    .from("short_term_memory")
    .select("id, memory_text, created_at, session_id, memory_context")
    .order("created_at", { ascending: false })
    .eq("id", id);

  if (error || !data) {
    console.log("Error getting memories", error);
    return null;
  }
  console.log(data);

  return data[0] || [];
};
