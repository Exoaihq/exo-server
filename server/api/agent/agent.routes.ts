import { Router } from "express";
import { testUpdateExisting, useAgent } from "./agent.controller";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";

const agentRouter = Router();

// Base route: /agent

agentRouter.post("/", ensureAuthenticated, useAgent);
// agentRouter.post("/", testUpdateExisting);
export default agentRouter;
