import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureOwnerRow, hasOwnerIntent } from "@/lib/auth/owner";
import { safeRedirectPath } from "@/lib/safe-redirect";

/**
 * Landing point for the sign-up confirmation email (see emailRedirectTo in
 * src/app/(marketing)/register/actions.ts). Supabase has already confirmed
 * the email by the time the browser gets here; this route turns the link
 * into a session and finishes the owner registration that sign-up couldn't
 * (no session existed then to create the restaurant_owners row with).
 *
 * Handles both link styles: `?code=` (PKCE, the @supabase/ssr default) and
 * `?token_hash=&type=` (if the email template is customized to use it).
 *
 * A PKCE code can only be exchanged in the browser that started sign-up
 * (the code verifier lives in a cookie there). Opened anywhere else, the
 * exchange fails even though the email IS confirmed, so that case sends
 * the owner to log in rather than showing an error -- login completes the
 * registration from the account_type metadata.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeRedirectPath(searchParams.get("next"), "/dashboard");
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);

  // Supabase redirects here with error params for expired/invalid links.
  if (searchParams.get("error")) {
    loginUrl.searchParams.set("notice", "confirm_failed");
    return NextResponse.redirect(loginUrl);
  }

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  let user: User | null = null;
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) user = data.user;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) user = data.user;
  }

  if (!user) {
    loginUrl.searchParams.set("notice", "confirmed");
    return NextResponse.redirect(loginUrl);
  }

  if (hasOwnerIntent(user)) {
    const { error } = await ensureOwnerRow(supabase, user);
    if (error) {
      // Signed in but no owner row: /login shows the "finish setting up"
      // prompt for exactly this state.
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
