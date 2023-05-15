import { Router } from "express";
import { acceptWebhook } from "./github.controller";
import { verifyGithubWebhook } from "../../middleware/githubWebhookAuth";

const githubRoutes = Router();

// Base route: /github

githubRoutes.post("/", verifyGithubWebhook, acceptWebhook);

export default githubRoutes;
