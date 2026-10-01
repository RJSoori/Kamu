import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * SERVER-ONLY client authenticated with the service-role key. Bypasses Row
 * Level Security entirely -- it does not read the request's session and is
 * not "the current user" in any sense.
 *
 * Use sparingly: admin bootstrap tasks, backend jobs, anything that
 * genuinely needs to act outside a user's RLS scope. Everyday admin-panel
 * CRUD should go through the server client (src/lib/supabase/server.ts)
 * instead, so the admin_users RLS policies are the real enforcement
 * boundary being exercised, not bypassed.
 *
 * The `server-only` import above (transitively, via env.server.ts) makes an
 * accidental import from a Client Component fail the build.
 */
export function createAdminClient() {
  return createSupabaseClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
