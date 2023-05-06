import { Router } from "express";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import { getTasks, testTasks, updateTask } from "./task.controller";

const taskRoutes = Router();

// Base route: /task

taskRoutes.get("/", ensureAuthenticated, getTasks);
taskRoutes.put("/", ensureAuthenticated, updateTask);
taskRoutes.get("/test", testTasks);

export default taskRoutes;
