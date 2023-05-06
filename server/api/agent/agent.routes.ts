import { Router } from "express";
import { testAgent, useAgent } from "./agent.controller";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";

const agentRouter = Router();

// Base route: /agent

agentRouter.post("/", ensureAuthenticated, useAgent);
agentRouter.get("/test", testAgent);
export default agentRouter;
