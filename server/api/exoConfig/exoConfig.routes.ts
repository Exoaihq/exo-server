import { Router } from "express";
import { updateExoConfig } from "./exoConfig.controller";

const exoConfigRoutes = Router();

// Base route: /exo-config

exoConfigRoutes.post("/", updateExoConfig);

export default exoConfigRoutes;
