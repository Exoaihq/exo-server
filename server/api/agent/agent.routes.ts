import { Router } from "express";
import { testAgent, useAgent } from "./agent.controller";

const agentRouter = Router();

// Base route: /agent

agentRouter.post("/", useAgent);
// agentRouter.post("/", testAgent);

export default agentRouter;
