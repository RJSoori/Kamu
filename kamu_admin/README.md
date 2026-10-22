# Kamu Admin

The private back office for Kamu. Admins use it to:

- **Restaurants**: add, edit, publish and delete listings and menus
- **Owners**: verify restaurant owners once (approve / reject), or suspend them
- **Reports**: work the queue of customer reports, hide a listing or menu item
- **Stats**: pending owners, open reports, customers, most-saved restaurants

It's its own Next.js app, next to the customer app (`../kamu`) and the owner
portal (`../kamu_restaurants`). All three share one Supabase project.

## How access works

Only users with a row in the `admin_users` table get in. There's no way to
sign up as an admin from the app; add the row by hand in the Supabase SQL
editor after the person has an account:

```sql
insert into admin_users (id)
select id from auth.users where email = 'someone@example.com';
```

Every page under `src/app/(protected)` checks this with `requireAdmin()`
([src/lib/admin/guard.ts](src/lib/admin/guard.ts)). The database enforces it
too: the RLS policies only let `is_admin()` users approve owners, hide
content or close reports, so a non-admin can't do any of it even by calling
Supabase directly. No service-role key is used.

The database rules this app builds on are documented in
[../kamu/docs/owner-verification-and-reports.md](../kamu/docs/owner-verification-and-reports.md).
Migrations live in `../kamu/supabase/migrations`.

## Running locally

```bash
cp .env.example .env.local   # same Supabase URL + anon key as kamu/
npm install
npm run dev                  # http://localhost:3002
```

## Layout

```
src/app/login/            sign-in page (outside the guard)
src/app/(protected)/      everything else; layout.tsx runs requireAdmin()
  restaurants/            listings + menus
  owners/                 owner verification queue
  reports/                customer report queue
  stats/                  numbers at a glance
src/lib/data/             Supabase reads/writes for restaurants + menu items
```

## Deploying

Same setup as the owner portal (see
[../kamu_restaurants/docs/azure-deployment.md](../kamu_restaurants/docs/azure-deployment.md)),
as a third web app on the shared App Service plan. The deploy workflow
(`.github/workflows/admin-deploy.yml`) is skipped until the repo variable
`AZURE_ADMIN_WEBAPP_NAME` and secret `AZURE_ADMIN_WEBAPP_PUBLISH_PROFILE` are set.
