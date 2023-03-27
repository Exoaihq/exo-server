import express, { Express, Request, Response } from "express";
import routes from "./routes/routes";
import cors from "cors";
import bodyParser from "body-parser";
import codeSnippetRoutes from "./server/api/codeSnippet/codeSnippet.routes";
import codeFileRoutes from "./server/api/codeFile/codeFile.routes";
import { port } from "./utils/envVariable";
import messageRoutes from "./server/api/message/message.routes";

const app: Express = express();

var corsOptions = {
  origin: "*",
};

app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use("/code-file", codeFileRoutes);
app.use("/code-snippet", codeSnippetRoutes);
app.use("/messages", messageRoutes);
app.use("/", routes);

app.listen(process.env.PORT, () => {
  console.log(`[Server]: Running at https://localhost:${port}`);
});
