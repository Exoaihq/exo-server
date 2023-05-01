import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import { runScheduledTasks } from "./cron";
import routes from "./routes/routes";
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
import { port } from "./utils/envVariable";

const app: Express = express();

var corsOptions = {
  origin: "*",
};

app.use(
  bodyParser.json({
    limit: "50mb",
  })
);
app.use(cors(corsOptions));

app.use("/ai-completed-code", aiCreatedCode);
app.use("/code-directory", codeDirectoryRoutes);
app.use("/code-file", codeFileRoutes);
app.use("/code-snippet", codeSnippetRoutes);
app.use("/messages", messageRoutes);
app.use("/code", agentRouter);
app.use("/agent", agentRouter);
app.use("/search", searchRoutes);
app.use("/prompt", promptRoutes);
app.use("/slack", slackRoutes);
app.use("/exo-config", exoConfigRoutes);
app.use("/", routes);

runScheduledTasks();

app.listen(process.env.PORT, () => {
  console.log(`[Server]: Running at https://localhost:${port}`);
});
