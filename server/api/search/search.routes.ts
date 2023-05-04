import { Router } from "express";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";
import { searchCode } from "./search.controller";

const searchRoutes = Router();

// Base route: /search

searchRoutes.post("/", ensureAuthenticated, searchCode);

export default searchRoutes;
