import { Router } from "express";
import { createObjective, getObjectives } from "./objective.controller";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";

const objectiveRoutes = Router();

// Base route: /objective

objectiveRoutes.get("/", ensureAuthenticated, getObjectives);
objectiveRoutes.post("/", ensureAuthenticated, createObjective);

export default objectiveRoutes;
