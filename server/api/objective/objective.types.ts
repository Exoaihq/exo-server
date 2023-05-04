import { Database } from "../../../types/supabase";
import { Task } from "../task/task.types";

export type Objective = Database["public"]["Tables"]["objective"]["Row"];

export type ObjectiveWithTasks = Objective & { task: Task[] };
