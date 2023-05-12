import { createClient } from "@supabase/supabase-js";
import { createServer } from "./createServer";
import { Database } from "./types/supabase";
import { port, supabaseKey, supabaseUrl } from "./utils/envVariable";

// Create a single supabase client for interacting with your database
export const supabaseBaseServerClient = createClient<Database>(
  supabaseUrl,
  supabaseKey
);

const app = createServer();

app.listen(process.env.PORT, () => {
  console.log(`[Server]: Running at https://localhost:${port}`);
});
