import { Router } from "express";
import { useAgent } from "./agent.controller";

const agentRouter = Router();

// Base route: /agent

agentRouter.post("/", useAgent);

export default agentRouter;
