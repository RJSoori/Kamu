# kamu_restaurants

Restaurant owner portal for [Kamu](../PROJECT.md) -- a **separate app** from
the customer-facing site in [`../kamu`](../kamu), deliberately. Owners
register/log in here and manage their own listing(s); customers never see
this app and it's deployed on its own.

It shares one Supabase project with `../kamu` (same `restaurants` /
`menu_items` tables, same `auth.users` pool) rather than standing up a
second database -- see `.env.example`. Because Supabase Auth is shared
project-wide, the same email/password can technically hold both a customer
account and an owner account; that's intentional (someone can be a diner
*and* an owner), not a bug.

**Scope note:** PROJECT.md §3/§12 originally specified admin-added listings
only, with owner self-signup explicitly out of scope for MVP. This app is a
deliberate reversal of that, done at the user's request on 2026-09-11 --
PROJECT.md has been annotated accordingly. See
`../kamu/supabase/migrations/20260911120000_restaurant_owners.sql` for the
schema/RLS change that backs it (migrations for the shared DB live in
`../kamu/supabase`, not duplicated here).

## What's built so far

- Register / log in / log out (email + password, via Supabase Auth)
- A `restaurant_owners` row is created on register; login checks one exists
  and rejects sign-in otherwise (so a plain customer account can't wander
  into the owner dashboard just by sharing credentials -- see
  `src/lib/auth/guard.ts`)
- A protected `/dashboard` shell (nav + sign out) behind that guard

**Not built yet** (next phase): the actual "add/edit your restaurant" forms.
The DB side is ready for it (`restaurants.owner_id`, ownership RLS on
`restaurants` + `menu_items`) but no UI calls it yet -- `/dashboard` is a
placeholder.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in from ../kamu/.env.local
npm run dev
```

Runs on port 3000 by default -- if `../kamu`'s dev server is already running
there, start this one with `npm run dev -- -p 3001` (or similar) instead.

## Before this can actually work

The migration adding `restaurant_owners` + the ownership RLS policies
(`../kamu/supabase/migrations/20260911120000_restaurant_owners.sql`) needs
to be applied to the live Supabase project -- same manual step as the rest
of `../kamu/supabase/migrations`, not yet automated.
