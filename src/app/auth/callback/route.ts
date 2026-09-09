import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRow } from "@/lib/auth/customer";

/**
 * PKCE OAuth callback for Supabase Auth (Google sign-in). Supabase redirects
 * the browser here with a `code` query param after the provider round-trip;
 * exchanging it for a session is what actually sets the auth cookies (the
 * GoogleSignInButton redirect that started this flow can't do that itself).
 *
 * Must be registered as an allowed redirect URL in Supabase Dashboard ->
 * Authentication -> URL Configuration once a production domain exists.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next =
    nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  await ensureCustomerRow(supabase, data.user);

  return NextResponse.redirect(`${origin}${next}`);
}
