import { Router } from "express";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import { getTasks, updateTask } from "./task.controller";

const taskRoutes = Router();

// Base route: /task

taskRoutes.get("/", ensureAuthenticated, getTasks);
taskRoutes.put("/", ensureAuthenticated, updateTask);

export default taskRoutes;
