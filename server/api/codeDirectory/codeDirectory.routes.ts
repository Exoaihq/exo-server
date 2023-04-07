import { Router } from "express";
import {
  createDirectoryByAccount,
  getCodeDirectoriesByAccount,
  setDirectoryToAddFile,
} from "./codeDirectory.controller";

const codeDirectoryRoutes = Router();

// Base route: /code-directory

codeDirectoryRoutes.get("/", getCodeDirectoriesByAccount);
codeDirectoryRoutes.post("/", createDirectoryByAccount);
codeDirectoryRoutes.post("/add-file", setDirectoryToAddFile);

export default codeDirectoryRoutes;
