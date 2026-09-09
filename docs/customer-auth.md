# Customer Auth

Email/password and Google sign-in for customers, separate from the admin
login (`/admin/login`) which only ever provisions `admin_users`, not
`customers`.

## What's wired up

- `/login`, `/signup` — email/password via Supabase Auth
- "Continue with Google" button on both — OAuth via `/auth/callback`
  ([src/app/auth/callback/route.ts](../src/app/auth/callback/route.ts))
- [ensureCustomerRow](../src/lib/auth/customer.ts) — creates the matching
  `customers` row on first login/signup/OAuth callback (idempotent, safe to
  call every time)
- [SiteHeader](../src/components/SiteHeader.tsx) — shows Log in/Sign up or
  the signed-in email + Log out, scoped to the `(site)` route group so it
  doesn't appear on `/admin/*`

## Manual setup still required

Email/password works out of the box against any Supabase project. Google
does not — it needs two things configured outside this repo before the
button will work:

1. **Google Cloud Console**: an OAuth client (Web application type) with
   `<your Supabase project ref>.supabase.co/auth/v1/callback` as an
   authorized redirect URI.
2. **Supabase Dashboard → Authentication → Providers → Google**: paste that
   client's ID and secret, and enable the provider.

Until both are done, the Google button redirects and comes back with a
"provider not enabled" error — the code path is correct, it's just an
external config step.

Also worth checking: **Authentication → Providers → Email → Confirm email**.
If enabled (default), `signUp()` doesn't return a session and the signup
form shows a "check your email" message instead of logging the user in
immediately — that's expected, not a bug.

## Redirect allowlist

Once deployed (see [azure-deployment.md](azure-deployment.md)), add the
production URL under **Authentication → URL Configuration → Redirect URLs**
in Supabase (e.g. `https://kamu-app.azurewebsites.net/auth/callback`) —
`exchangeCodeForSession` will reject callbacks from an origin that isn't
allow-listed there.
