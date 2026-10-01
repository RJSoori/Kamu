# kamu_restaurants

Restaurant owner portal for [Kamu](../PROJECT.md). It's a **separate app**
from the customer-facing site in [`../kamu`](../kamu), deliberately. Owners
register, get verified once by the Kamu team, and then manage their own
listings and menus here. Customers never see this app, and it's deployed on
its own (Azure App Service, see [docs/azure-deployment.md](docs/azure-deployment.md)).

It shares one Supabase project with `../kamu` (same `restaurants` and
`menu_items` tables, same `auth.users` pool) rather than standing up a second
database. Because Supabase Auth is shared project-wide, one account can be
both a customer and an owner. Someone who already has a customer account logs
in here and is offered an explicit "register as a restaurant owner" step;
nobody becomes an owner automatically.

Database migrations for the shared project live in `../kamu/supabase`, not
here. The two that back this app:

- `20260911120000_restaurant_owners.sql`: owner accounts and listing ownership
- `20261001120000_owner_verification_and_reports.sql`: one-time admin
  verification, admin takedowns, customer reports, owner photo uploads

## How moderation works

- A new owner starts **pending**. They can build their listing and menu
  straight away, but nothing they own is visible to customers yet.
- A Kamu admin **verifies the account once**. After that the owner's
  published listings are live immediately, and later edits need no review.
- Customers can **report** restaurants or menu items. Admins can hide a
  single item (the owner sees it marked "Hidden by Kamu" with the reason and
  can't un-hide it), or suspend the owner, which takes everything offline and
  makes the dashboard read-only.

All of this is enforced in the database (RLS policies plus guard triggers),
not just in this UI. The admin side is a separate admin portal built by a
teammate; its contract is
[`../kamu/docs/owner-verification-and-reports.md`](../kamu/docs/owner-verification-and-reports.md).

## What's here

- Register (name, phone, email, password), log in, log out. Works whether or
  not the Supabase project requires email confirmation:
  `/auth/confirm` finishes registration from the email link, and login
  finishes it if the link was opened in another browser.
- `/dashboard`: verification status, the owner's restaurants and whether each
  one is live
- Add/edit a restaurant: details, area (suggesting existing spellings), price
  range, cuisines, map coordinates, a vibe description (what mood search
  matches against), a 7-day opening-hours editor, cover photo, publish toggle.
  Saving a changed vibe description re-embeds it for mood search through the
  `embed-restaurant` Edge Function.
- Menu: items grouped by category, with add, edit, delete, prices in LKR and
  optional photos
- Photos upload from the browser straight to Supabase Storage under
  `owners/<owner id>/` (5 MB, JPEG/PNG/WebP)

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in from ../kamu/.env.local
npm run dev                  # http://localhost:3001
```

`npm run dev` uses port 3001 so it can run alongside `../kamu` on 3000.

Checks (also run by CI on every push and PR):

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

The database rules have their own pgTAP suite in
`../kamu/supabase/tests/database/`. Run it with `npx supabase start` and then
`npx supabase test db` from `../kamu`.

## Before this works against the real project

1. Apply the two migrations above to the live Supabase project, same manual
   step as the rest of `../kamu/supabase/migrations`.
2. Add this app's `/auth/confirm` URL to Supabase's redirect URL allow-list
   (see [docs/azure-deployment.md](docs/azure-deployment.md)).
3. Redeploy the `embed-restaurant` Edge Function. It now authorizes owners
   itself and writes with the service role.
