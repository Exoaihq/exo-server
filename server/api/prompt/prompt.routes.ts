import { Router } from "express";
import { getGlobalPrompts, handleSelectedPrompt } from "./prompt.controller";

const promptRoutes = Router();

// Base route: /prompts

promptRoutes.get("/", getGlobalPrompts);
promptRoutes.post("/", handleSelectedPrompt);

export default promptRoutes;
