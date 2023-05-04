import { Router } from "express";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import {
  createDirectoryByAccount,
  getCodeDirectoriesByAccount,
  setDirectoryToAddFile,
  updateDirectory,
} from "./codeDirectory.controller";

const codeDirectoryRoutes = Router();

// Base route: /code-directory

codeDirectoryRoutes.get("/", ensureAuthenticated, getCodeDirectoriesByAccount);
codeDirectoryRoutes.put("/", ensureAuthenticated, updateDirectory);
codeDirectoryRoutes.post("/", ensureAuthenticated, createDirectoryByAccount);
codeDirectoryRoutes.post(
  "/add-file",
  ensureAuthenticated,
  setDirectoryToAddFile
);

export default codeDirectoryRoutes;
