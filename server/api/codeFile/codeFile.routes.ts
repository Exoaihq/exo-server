import { Router } from "express";

import {
  addAllFilesToDb,
  assignSnippetToFile,
  findAllFilesWithoutExplainations,
  findAllFilesWithoutExplainationsAndAddThem,
  findAllSnippetsWithoutFiles,
  findFileById,
} from "../codeSnippet/codeSnippet.controller";
import { findAndUpdateFiles } from "./codeFile.controller";

export const routes = Router();

const codeFileRoutes = Router();

// Base route: /code-file

codeFileRoutes.get("/add", addAllFilesToDb);
codeFileRoutes.get("/assign-snippet", assignSnippetToFile);
codeFileRoutes.get(
  "/find-all-snippets-without-files",
  findAllSnippetsWithoutFiles
);
codeFileRoutes.get("/find-by-id", findFileById);
codeFileRoutes.get(
  "/find-without-explaination",
  findAllFilesWithoutExplainations
);
codeFileRoutes.get(
  "/find-without-explaination-add-them",
  findAllFilesWithoutExplainationsAndAddThem
);

codeFileRoutes.get("/find-and-update", findAndUpdateFiles);

export default codeFileRoutes;
