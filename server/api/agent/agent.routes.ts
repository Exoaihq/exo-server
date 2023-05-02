import { Router } from "express";
import { testAgent, testUpdateExisting, useAgent } from "./agent.controller";

const agentRouter = Router();

// Base route: /agent

agentRouter.post("/", useAgent);
// agentRouter.post("/", testUpdateExisting);
// agentRouter.post("/", testAgent);
export default agentRouter;
