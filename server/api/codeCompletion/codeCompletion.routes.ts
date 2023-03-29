import { Router } from "express";
import {
  handleCodeCompletion,
  handleFileUpload,
} from "./codeCompletion.controller";

const codeCompletionRoutes = Router();

// Base route: /code

codeCompletionRoutes.post("/", handleCodeCompletion);

codeCompletionRoutes.post("/file", handleFileUpload);

export default codeCompletionRoutes;
