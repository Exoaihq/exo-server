// ```typescript
// Import required modules
import { App, LogLevel } from "@slack/bolt";
import { Request, Response } from "express";

import { slackBotToken, slackSigningSecret } from "../../../utils/envVariable";
import axios from "axios";

const CHANNEL_ID = "C050UHPFZAL";

// // Initialize the Slack webhook client
// const web = new WebClient(slackBotToken);

// curl -X POST -H 'Content-type: application/json' --data '{"text":"Hello, World!"}'

const url =
  "https://hooks.slack.com/services/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";

export const postSlack = async (message: string) => {
  const response = await axios(url, {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    data: JSON.stringify({ text: message }),
  });
  console.log(response);
};

// // Initialize the Slack app with the bot token and signing secret
// const app = new App({
//   token: slackBotToken,
//   signingSecret: slackSigningSecret,
//   logLevel: LogLevel.DEBUG,
// });

// export async function onUserSignUp(username: string): Promise<void> {
//   try {
//     // Send a message to the target channel using the Slack API
//     await app.message("hey");
//   } catch (error) {
//     console.error(`Error sending a message: ${error}`);
//   }
// }

// Example usage - this should be called when a new user signs up
export async function sendUserSignupToSlack(req: Request, res: Response) {
  const { record } = req.body;
  const { email } = record;

  await postSlack(`New user signed up: ${email}`);
}
// ```

// Replace the bot token, signing secret, and target channel ID with your own values. This function assumes that the user signup event is already handled and passes the username as an argument. Once triggered, the function will send a message to the specified channel in Slack with the new user's name.
