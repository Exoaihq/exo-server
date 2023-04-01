import { Router } from "express";
import { getAiCompletedCode } from "./aiCreatedCode.controller";

const aiCreatedCode = Router();

// Base route: /ai-created-code

aiCreatedCode.get("/", getAiCompletedCode);

export default aiCreatedCode;
