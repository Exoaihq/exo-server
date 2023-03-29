import { Router } from "express";
import { getCodeDirectoriesByAccount } from "./codeDirectory.controller";

const codeDirectoryRoutes = Router();

// Base route: /code-directory

codeDirectoryRoutes.get("/", getCodeDirectoriesByAccount);

export default codeDirectoryRoutes;
