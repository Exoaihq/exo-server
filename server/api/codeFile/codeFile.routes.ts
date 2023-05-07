import { Router } from "express";

import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import {
  findAndUpdateFilesFromClient,
  handleFileUpload,
  handleWriteTests,
} from "./codeFile.controller";

const codeFileRoutes = Router();

// Base route: /code-file

codeFileRoutes.post("/", ensureAuthenticated, findAndUpdateFilesFromClient);
codeFileRoutes.post("/add", ensureAuthenticated, handleFileUpload);
codeFileRoutes.post("/write-tests", ensureAuthenticated, handleWriteTests);

export default codeFileRoutes;
