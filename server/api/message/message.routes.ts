import { Router } from "express";
import { createMessages, getMessages } from "./message.controller";
import { ensureAuthenticated } from "../../middleware/isAuthenticated";

const messageRoutes = Router();

// Base route: /messages

messageRoutes.get("/", ensureAuthenticated, getMessages);

messageRoutes.post("/", ensureAuthenticated, createMessages);

export default messageRoutes;
