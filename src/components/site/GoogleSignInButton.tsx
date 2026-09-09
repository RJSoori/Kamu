"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

/**
 * Initiates Google OAuth from the browser client rather than a Server
 * Action: signInWithOAuth() in a browser context returns an authorization
 * URL and (unless skipBrowserRedirect is set) navigates the page there
 * itself, which is exactly the redirect-to-Google-and-back flow we want.
 * Doing this server-side would mean reconstructing the request's own origin
 * by hand just to build the redirectTo URL -- the browser already knows it.
 *
 * Requires the Google provider to be enabled under Supabase Dashboard ->
 * Authentication -> Providers, with this app's /auth/callback listed as an
 * allowed redirect URL. Until that's configured, this button will fail with
 * a Supabase-side "provider not enabled" error.
 */
export function GoogleSignInButton({ next = "/" }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleClick() {
    setIsPending(true);
    setError(null);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      setError(error.message);
      setIsPending(false);
    }
    // On success the browser is already being redirected to Google -- no
    // further state update needed (or possible).
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-full rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        {isPending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
