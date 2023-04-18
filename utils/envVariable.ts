require("dotenv").config();

export const { env } = process;
const {
  SUPABASE_KEY,
  SUPABASE_URL,
  PWD,
  OPENAI_API_KEY,
  PORT,
  SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET,
} = env;

export const supabaseKey = SUPABASE_KEY ? SUPABASE_KEY : "";
export const supabaseUrl = SUPABASE_URL ? SUPABASE_URL : "";
export const rootProjectDirectory = PWD ? PWD : __dirname;
export const openAiApiKey = OPENAI_API_KEY ? OPENAI_API_KEY : "";
export const port = PORT ? PORT : 8081;
export const slackBotToken = SLACK_BOT_TOKEN ? SLACK_BOT_TOKEN : "";
export const slackSigningSecret = SLACK_SIGNING_SECRET
  ? SLACK_SIGNING_SECRET
  : "";
