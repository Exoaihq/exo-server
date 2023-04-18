import { Router } from "express";
import { sendUserSignupToSlack } from "./slack.controller";

const slackRoutes = Router();

// Base route: /slack

slackRoutes.post("/", sendUserSignupToSlack);

export default slackRoutes;
