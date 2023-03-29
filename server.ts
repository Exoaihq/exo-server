import bodyParser from "body-parser";
import cors from "cors";
import express, { Express } from "express";
import routes from "./routes/routes";
import codeCompletionRoutes from "./server/api/codeCompletion/codeCompletion.routes";
import codeDirectoryRoutes from "./server/api/codeDirectory/codeDirectory.routes";
import codeFileRoutes from "./server/api/codeFile/codeFile.routes";
import codeSnippetRoutes from "./server/api/codeSnippet/codeSnippet.routes";
import messageRoutes from "./server/api/message/message.routes";
import { port } from "./utils/envVariable";

const app: Express = express();

var corsOptions = {
  origin: "*",
};

app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use("/code-directory", codeDirectoryRoutes);
app.use("/code-file", codeFileRoutes);
app.use("/code-snippet", codeSnippetRoutes);
app.use("/messages", messageRoutes);
app.use("/code", codeCompletionRoutes);
app.use("/", routes);

app.listen(process.env.PORT, () => {
  console.log(`[Server]: Running at https://localhost:${port}`);
});
