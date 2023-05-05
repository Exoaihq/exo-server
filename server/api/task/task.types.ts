import { Database } from "../../../types/supabase";
import { ObjectiveWithTasks } from "../objective/objective.types";

export type Task = Database["public"]["Tables"]["task"]["Row"];

export type TaskWithObjective = Task & { objective: ObjectiveWithTasks };
