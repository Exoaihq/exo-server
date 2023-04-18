import { Router } from "express";
import { sendUserSignupToSlack } from "./slack.controller";

const slackRoutes = Router();

// Base route: /slack

slackRoutes.get("/", sendUserSignupToSlack);

export default slackRoutes;
