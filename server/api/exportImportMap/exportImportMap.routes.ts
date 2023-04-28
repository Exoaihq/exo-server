import { Router } from "express";
import { handleGetExportImportMap } from "./exportImportMap.controller";

const exportImportMapRoutes = Router();

// Base route: /export-import-maps

exportImportMapRoutes.get("/", handleGetExportImportMap);

export default exportImportMapRoutes;
