import { createClient } from "@supabase/supabase-js";
import { Database } from "../../../types/supabase";

import { supabaseKey, supabaseUrl } from "../../../utils/envVariable";
import { TaskWithObjective } from "./task.types";
import { getObjectivesBySession } from "../objective/objective.repository";

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export const getTasksBySession = async (
  sessionId: string
): Promise<Partial<Database["public"]["Tables"]["task"]["Row"]>[] | []> => {
  const objective = await getObjectivesBySession(sessionId);
  const objectionIds = objective.map((obj) => obj.id);

  if (!objective || objective.length === 0) return [];
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .order("created_at", { ascending: false })
    .in("objective_id", [...objectionIds]);

  if (error || !data) {
    console.log("Error getting tasks", error);
    return [];
  }

  return data || [];
};

export const getIncompleteTasks = async (): Promise<
  [] | Database["public"]["Tables"]["task"]["Row"][]
> => {
  const { data, error } = await supabase
    .from("task")
    .select("*")
    .is("completed_at", null)
    .is("started_eval_at", null)
    .is("tool_output", null)
    .eq("marked_ready", true)
    // .eq("id", "94a7f228-038c-496b-ab0e-68867802068d")
    .not("tool_input", "is", null)
    .not("tool_name", "is", null);

  if (error || !data) {
    console.log("Error getting incomplete tasks", error);
    return [];
  }

  return data || [];
};

export const getCompletedTasks = async (): Promise<
  [] | TaskWithObjective[]
> => {
  const { data, error } = await supabase
    .from("task")
    .select("*, objective(*, session_id, task(*))")
    .is("loop_evaluated_at", null)
    .not("tool_output", "is", null)
    .not("tool_name", "is", null);

  if (error || !data) {
    console.log("Error getting completed tasks", error);
    return [];
  }

  return (data as TaskWithObjective[]) || [];
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
    .from("task")
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

export const updateTaskById = async (
  taskId: string,
  task: Partial<Database["public"]["Tables"]["task"]["Update"]>
): Promise<any> => {
  const { data } = await supabase
    .from("task")
    .update({ ...task })
    .eq("id", taskId)
    .select();

  return data;
};
