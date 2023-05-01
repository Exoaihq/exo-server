import { Router } from "express";
import {
  findAllSnippetsWithoutFilesAndAssign,
  generateCode,
  getCodeSnippet,
  searchCodeEmbeddings,
  testCodeNodeParsing,
  testGpt4,
} from "./codeSnippet.controller";

export const routes = Router();

const codeSnippetRoutes = Router();

// Base route: /code-snippet

codeSnippetRoutes.get("/get", getCodeSnippet);
codeSnippetRoutes.get("/openai", testGpt4);
codeSnippetRoutes.get("/search", searchCodeEmbeddings);
codeSnippetRoutes.get("/generate-code", generateCode);
codeSnippetRoutes.get("/parse-nodes", testCodeNodeParsing);

codeSnippetRoutes.get(
  "/find-and-assign-file",
  findAllSnippetsWithoutFilesAndAssign
);

export default codeSnippetRoutes;
