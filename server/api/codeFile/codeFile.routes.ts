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
  findAndUpdateFilesFromServerFileSys,
  handleFileUpload,
} from "./codeFile.controller";

export const routes = Router();

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

codeFileRoutes.get("/find-and-update", findAndUpdateFilesFromServerFileSys);

export default codeFileRoutes;
