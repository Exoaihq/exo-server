import { Router } from "express";
import { createMessages, getMessages } from "./message.controller";

export const routes = Router();

const messageRoutes = Router();

// Base route: /messages

messageRoutes.get("/", getMessages);

messageRoutes.post("/", createMessages);

export default messageRoutes;
