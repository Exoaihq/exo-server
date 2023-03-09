require('dotenv').config()

export const { env } = process
const { SUPABASE_KEY, SUPABASE_URL, PWD } = env

export const supabaseKey = SUPABASE_KEY ? SUPABASE_KEY : ''
export const supabaseUrl = SUPABASE_URL ? SUPABASE_URL : ''
export const rootProjectDirectory = PWD ? PWD : __dirname 
