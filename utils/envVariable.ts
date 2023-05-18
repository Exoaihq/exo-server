require("dotenv").config();

export const { env } = process;
const {
  SUPABASE_ANON,
  SUPABASE_URL,
  PWD,
  OPENAI_API_KEY,
  PORT,
  SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET,
  EXO_GITHUB_APP_WEBHOOK_SECRET,
  GITHUB_PRIVATE_KEY,
  GITHUB_EXO_APP_ID,
  NODE_ENV,
} = env;

export const isProduction =
  NODE_ENV && NODE_ENV === "production" ? true : false;
export const supabaseKey = SUPABASE_ANON ? SUPABASE_ANON : "";
export const supabaseUrl = SUPABASE_URL ? SUPABASE_URL : "";
export const rootProjectDirectory = PWD ? PWD : __dirname;
export const openAiApiKey = OPENAI_API_KEY ? OPENAI_API_KEY : "";
export const port = PORT ? PORT : 8081;
export const slackBotToken = SLACK_BOT_TOKEN ? SLACK_BOT_TOKEN : "";
export const slackSigningSecret = SLACK_SIGNING_SECRET
  ? SLACK_SIGNING_SECRET
  : "";
export const exoGithubAppWebhookSecret = EXO_GITHUB_APP_WEBHOOK_SECRET
  ? EXO_GITHUB_APP_WEBHOOK_SECRET
  : "";
export const githubPrivateKey = GITHUB_PRIVATE_KEY
  ? GITHUB_PRIVATE_KEY.replace(/\\n/g, "\n")
  : "";
export const githubExoAppId = GITHUB_EXO_APP_ID || "";
