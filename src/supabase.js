import { createClient } from "@supabase/supabase-js";

/**
 * Supabase configuration.
 *
 * Replace these two values with your own from the Supabase dashboard:
 *   Settings → API → Project URL and anon/public key.
 *
 * The anon key is safe to expose in client-side code — Row Level Security
 * policies in Postgres ensure each user can only access their own data.
 */
const SUPABASE_URL = "https://fusruugffrzpdzexaxzf.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_g5DralrcYmWYti3_WcL5Aw_W8wfgoNl";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
