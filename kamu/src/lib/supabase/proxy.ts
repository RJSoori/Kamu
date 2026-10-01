import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Refreshes the Supabase auth cookie for the current request/response pair.
 * Called from the root proxy (src/proxy.ts -- Next.js 16 renamed the
 * "middleware" file convention to "proxy") on every matched request so
 * Server Components downstream always see an up-to-date session.
 *
 * This performs only the session refresh + a cheap "is there a user"
 * lookup. It is NOT the authoritative admin-role check -- that lives in
 * src/app/admin/(protected)/layout.tsx, which queries admin_users with the
 * request's real session. Keeping the role check out of proxy avoids an
 * extra DB round trip on every single request across the whole site, and
 * matches Next's own guidance that Proxy is for optimistic checks, not a
 * full authorization solution.
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
