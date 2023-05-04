import { Router } from "express";
import { handleCodeCompletion } from "../server/api/codeCompletion/codeCompletion.controller";
import {
  runCalculator,
  startChat,
  startClassification,
} from "../server/api/codeSnippet/chat.controller";
import { helloWorld } from "../server/api/codeSnippet/codeSnippet.controller";
import { getModels } from "../server/api/openAi/openAi.controller";

export const routes = Router();

const codeSnippet = Router();
codeSnippet.get("/", helloWorld);

codeSnippet.post("/chat", startClassification);
codeSnippet.get("/chat/test-gpt4", startChat);

codeSnippet.get("/calculator", runCalculator);

codeSnippet.post("/code", handleCodeCompletion);

codeSnippet.get("/models", getModels);

routes.use(codeSnippet);

export default routes;
