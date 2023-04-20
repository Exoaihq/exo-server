import { Router } from "express";
import { getTasks } from "./task.controller";

const taskRoutes = Router();

// Base route: /task

taskRoutes.get("/", getTasks);

export default taskRoutes;
