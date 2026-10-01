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
function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

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
        className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      >
        <GoogleLogo className="h-5 w-5 shrink-0" />
        {isPending ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
