require('dotenv').config()

export const { env } = process
const { SUPABASE_KEY, SUPABASE_URL, PWD, OPENAI_API_KEY } = env

export const supabaseKey = SUPABASE_KEY ? SUPABASE_KEY : ''
export const supabaseUrl = SUPABASE_URL ? SUPABASE_URL : ''
export const rootProjectDirectory = PWD ? PWD : __dirname
export const openAiApiKey = OPENAI_API_KEY ? OPENAI_API_KEY : ''
