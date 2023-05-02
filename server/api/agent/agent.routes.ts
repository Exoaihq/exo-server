import { Router } from "express";
import { testUpdateExisting, useAgent } from "./agent.controller";

const agentRouter = Router();

// Base route: /agent

agentRouter.post("/", useAgent);
// agentRouter.post("/", testUpdateExisting);
export default agentRouter;
