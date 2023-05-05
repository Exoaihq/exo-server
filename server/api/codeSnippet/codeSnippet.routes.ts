import { Router } from "express";
import { getCodeSnippets } from "./codeSnippet.controller";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";

const codeSnippetRoutes = Router();

// Base route: /code-snippet

codeSnippetRoutes.get("/", ensureAuthenticated, getCodeSnippets);

export default codeSnippetRoutes;
