import { Router } from "express";
import { searchCode } from "./search.controller";

const searchRoutes = Router();

// Base route: /search

searchRoutes.post("/", searchCode);

export default searchRoutes;
