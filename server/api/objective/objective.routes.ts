import { Router } from "express";
import { createObjective, getObjectives } from "./objective.controller";

const objectiveRoutes = Router();

// Base route: /objective

objectiveRoutes.get("/", getObjectives);

objectiveRoutes.post("/", createObjective);

export default objectiveRoutes;
