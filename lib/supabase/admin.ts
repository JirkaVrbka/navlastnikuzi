import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. SERVER-ONLY: it uses the secret key and bypasses
// Row-Level Security, so it must never be imported into a Client Component.
// Used for admin actions (creating users, seeding the first admin).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
