import { Router } from "express";
import { createMemory, getMemories } from "./memory.controller";

const memoryRoutes = Router();

// Base route: /messages

memoryRoutes.get("/", getMemories);

memoryRoutes.post("/", createMemory);

export default memoryRoutes;
