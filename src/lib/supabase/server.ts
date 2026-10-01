import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers, and Server
 * Actions. Mirrors kamu/src/lib/supabase/server.ts -- see that file's
 * comment for the cache()/cookie-write details, which apply identically
 * here.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component render -- expected, see above.
          }
        },
      },
    },
  );
});
