import { Router } from "express";

import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import {
  findAndUpdateFilesFromClient,
  handleFileUpload,
} from "./codeFile.controller";

const codeFileRoutes = Router();

// Base route: /code-file

codeFileRoutes.post("/", ensureAuthenticated, findAndUpdateFilesFromClient);
codeFileRoutes.post("/add", ensureAuthenticated, handleFileUpload);

export default codeFileRoutes;
