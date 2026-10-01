import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for Client Components. Mirrors
 * kamu/src/lib/supabase/browser.ts -- see that file's comment for why this
 * is a factory rather than a module-level singleton.
 */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
