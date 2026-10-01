import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Refreshes the Supabase auth cookie for the current request/response pair.
 * Called from the root proxy (src/proxy.ts -- Next.js 16 renamed the
 * "middleware" file convention to "proxy") on every matched request so
 * Server Components downstream always see an up-to-date session. Mirrors
 * kamu/src/lib/supabase/proxy.ts.
 *
 * Only a cheap "is there a user" check -- NOT the authoritative
 * owner-account check, which requires a restaurant_owners row and lives in
 * src/lib/auth/guard.ts (queried with the real session, from
 * src/app/dashboard/layout.tsx). See that file for why the split matters:
 * this project's auth.users pool is shared with the customer-facing app, so
 * "has a session" and "is an owner" are genuinely different questions here.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Revalidates the session with Supabase Auth (do not swap for
  // getSession(), which only trusts the local cookie without verifying it).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
