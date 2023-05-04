import { Router } from "express";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import { handleCodeCompletion } from "./codeCompletion.controller";

const codeCompletionRoutes = Router();

// Base route: /code

codeCompletionRoutes.post("/", ensureAuthenticated, handleCodeCompletion);

export default codeCompletionRoutes;
