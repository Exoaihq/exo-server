import { Router } from "express";

import {
  addAllFilesToDb,
  assignSnippetToFile,
  findAllFilesWithoutExplainations,
  findAllFilesWithoutExplainationsAndAddThem,
  findAllSnippetsWithoutFiles,
} from "../codeSnippet/codeSnippet.controller";
import {
  findAndUpdateFilesFromClient,
  handleFileUpload,
} from "./codeFile.controller";

const codeFileRoutes = Router();

// Base route: /code-file

codeFileRoutes.post("/", findAndUpdateFilesFromClient);
codeFileRoutes.post("/add", handleFileUpload);

codeFileRoutes.get("/add", addAllFilesToDb);
codeFileRoutes.get("/assign-snippet", assignSnippetToFile);
codeFileRoutes.get(
  "/find-all-snippets-without-files",
  findAllSnippetsWithoutFiles
);
codeFileRoutes.get(
  "/find-without-explaination",
  findAllFilesWithoutExplainations
);
codeFileRoutes.get(
  "/find-without-explaination-add-them",
  findAllFilesWithoutExplainationsAndAddThem
);

export default codeFileRoutes;
