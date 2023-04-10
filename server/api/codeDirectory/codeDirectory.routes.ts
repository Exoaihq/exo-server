import { Router } from "express";
import {
  createDirectoryByAccount,
  getCodeDirectoriesByAccount,
  setDirectoryToAddFile,
  updateDirectory,
} from "./codeDirectory.controller";

const codeDirectoryRoutes = Router();

// Base route: /code-directory

codeDirectoryRoutes.get("/", getCodeDirectoriesByAccount);
codeDirectoryRoutes.put("/", updateDirectory);
codeDirectoryRoutes.post("/", createDirectoryByAccount);
codeDirectoryRoutes.post("/add-file", setDirectoryToAddFile);

export default codeDirectoryRoutes;
