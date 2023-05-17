import { Router } from "express";
import { verifyGithubWebhook } from "../../middleware/githubWebhookAuth";
import { acceptWebhook, addFileToRepo } from "./github.controller";

const githubRoutes = Router();

// Base route: /github

githubRoutes.post("/", verifyGithubWebhook, acceptWebhook);
githubRoutes.get("/test-add-file-to-repo", addFileToRepo);

export default githubRoutes;
