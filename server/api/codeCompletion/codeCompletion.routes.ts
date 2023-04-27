import { Router } from "express";
import { handleCodeCompletion } from "./codeCompletion.controller";

const codeCompletionRoutes = Router();

// Base route: /code

codeCompletionRoutes.post("/", handleCodeCompletion);

export default codeCompletionRoutes;
