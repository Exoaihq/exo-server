import { Router } from "express";
import {
  createDirectoryByAccount,
  getCodeDirectoriesByAccount,
} from "./codeDirectory.controller";

const codeDirectoryRoutes = Router();

// Base route: /code-directory

codeDirectoryRoutes.get("/", getCodeDirectoriesByAccount);
codeDirectoryRoutes.post("/", createDirectoryByAccount);

export default codeDirectoryRoutes;
