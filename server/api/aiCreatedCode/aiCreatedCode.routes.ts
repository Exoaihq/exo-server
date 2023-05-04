import { Router } from "express";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import {
  getAiCompletedCode,
  updateAiCompletedCode,
} from "./aiCreatedCode.controller";

const aiCreatedCode = Router();

// Base route: /ai-completed-code

aiCreatedCode.get("/", ensureAuthenticated, getAiCompletedCode);
aiCreatedCode.post("/", ensureAuthenticated, updateAiCompletedCode);

export default aiCreatedCode;
