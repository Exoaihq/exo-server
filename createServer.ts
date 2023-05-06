import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import agentRouter from "./server/api/agent/agent.routes";
import aiCreatedCode from "./server/api/aiCreatedCode/aiCreatedCode.routes";
import codeCompletionRoutes from "./server/api/codeCompletion/codeCompletion.routes";
import codeDirectoryRoutes from "./server/api/codeDirectory/codeDirectory.routes";
import codeFileRoutes from "./server/api/codeFile/codeFile.routes";
import codeSnippetRoutes from "./server/api/codeSnippet/codeSnippet.routes";
import exoConfigRoutes from "./server/api/exoConfig/exoConfig.routes";
import messageRoutes from "./server/api/message/message.routes";
import promptRoutes from "./server/api/prompt/prompt.routes";
import searchRoutes from "./server/api/search/search.routes";
import slackRoutes from "./server/api/slack/slack.route";
import { runScheduledTasks } from "./cron";
import taskRoutes from "./server/api/task/task.routes";

export enum ApiRoutes {
  CODE_DIRECTORY = "/code-directory",
  MESSAGES = "/messages",
  CODE_COMPLETION = "/code",
  AI_COMPLETED_CODE = "/ai-completed-code",
  AGENT = "/agent",
  SEARCH = "/search",
  PROMPT = "/prompt",
  SLACK = "/slack",
  EXO_CONFIG = "/exo-config",
  CODE_SNIPPET = "/code-snippet",
  CODE_FILE = "/code-file",
  TASK = "/task",
}

export function createServer() {
  const app: Express = express();

  runScheduledTasks();

  var corsOptions = {
    origin: "*",
  };

  app.use(
    bodyParser.json({
      limit: "50mb",
    })
  );
  app.use(cors(corsOptions));

  app.use(ApiRoutes.AI_COMPLETED_CODE, aiCreatedCode);
  app.use(ApiRoutes.CODE_DIRECTORY, codeDirectoryRoutes);
  app.use(ApiRoutes.CODE_FILE, codeFileRoutes);
  app.use(ApiRoutes.CODE_SNIPPET, codeSnippetRoutes);
  app.use(ApiRoutes.MESSAGES, messageRoutes);
  app.use(ApiRoutes.CODE_COMPLETION, codeCompletionRoutes);
  app.use(ApiRoutes.AGENT, agentRouter);
  app.use(ApiRoutes.SEARCH, searchRoutes);
  app.use(ApiRoutes.PROMPT, promptRoutes);
  app.use(ApiRoutes.SLACK, slackRoutes);
  app.use(ApiRoutes.EXO_CONFIG, exoConfigRoutes);
  app.use(ApiRoutes.TASK, taskRoutes);
  return app;
}
