import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for Client Components. Creating this is cheap, so it's a
 * factory rather than a module-level singleton -- that avoids stale-closure
 * issues across Fast Refresh and keeps this file symmetrical with
 * server.ts/admin.ts, which can't be singletons (they're request-scoped).
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
