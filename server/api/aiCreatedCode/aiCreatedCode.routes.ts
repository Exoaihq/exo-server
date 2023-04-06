import { Router } from "express";
import {
  getAiCompletedCode,
  updateAiCompletedCode,
} from "./aiCreatedCode.controller";

const aiCreatedCode = Router();

// Base route: /ai-completed-code

aiCreatedCode.get("/", getAiCompletedCode);
aiCreatedCode.post("/", updateAiCompletedCode);

export default aiCreatedCode;
