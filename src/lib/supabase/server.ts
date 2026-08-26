import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for Server Components, Route Handlers, and Server
 * Actions. Reads the request's auth cookies, so -- unlike a plain anon-key
 * client -- RLS policies that key off auth.uid() actually see the logged-in
 * user here.
 *
 * Wrapped in React's cache() so every Server Component in one request's
 * render tree shares a single client instance instead of re-instantiating
 * (and re-reading cookies) per call.
 *
 * Writing cookies from a Server Component itself is a no-op by design (Next
 * only allows cookie writes from Route Handlers/Server Actions/Proxy); the
 * try/catch below is exactly for that expected case -- session refresh for
 * those requests is handled by src/proxy.ts instead.
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
