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
 * lookup. Proxy is for optimistic checks, not authorization: RLS and the
 * per-page checks are what actually protect data.
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
