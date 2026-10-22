# Kamu

Mood-based cafe and restaurant discovery for Sri Lanka. People describe what
they're in the mood for ("somewhere quiet to read with coffee") and get
matched to real places. [PROJECT.md](PROJECT.md) is the product and
engineering blueprint.

## What's in this repo

| Folder | What it is | Local dev |
|---|---|---|
| [`kamu/`](kamu) | Customer app: browse, mood search, bucket list, reviews, reporting bad content | `http://localhost:3000` |
| [`kamu_restaurants/`](kamu_restaurants) | Restaurant owner portal: owners register, get verified once, then manage their listings and menus | `http://localhost:3001` |
| [`kamu_admin/`](kamu_admin) | Admin portal: manage restaurants, verify owners, work the report queue, stats | `http://localhost:3002` |
| [`kamu/supabase/`](kamu/supabase) | The **shared** Supabase project: migrations, pgTAP tests, Edge Functions, seed data | |

All three are separate Next.js apps (each with its own `package.json`) that
share one Supabase project. They're hosted on **Azure App Service** as
separate web apps on one App Service plan.

## Running locally

Each app is installed and run from its own folder:

```bash
cd kamu && npm install && npm run dev               # customer app on :3000
cd kamu_restaurants && npm install && npm run dev   # owner portal on :3001
cd kamu_admin && npm install && npm run dev         # admin portal on :3002
```

Each needs its own `.env.local`, copied from that folder's `.env.example`.
All point at the same Supabase project.

Database changes go in `kamu/supabase/migrations`. The database tests run with
`npx supabase start` and then `npx supabase test db` from `kamu/`.

## CI and deploys

The workflows live in [`.github/workflows/`](.github/workflows), one pair per
app, and each only runs when its own folder changes:

- `customer-ci.yml` / `owner-ci.yml` / `admin-ci.yml`: lint, typecheck, test and build on PRs
  and pushes to `main`
- `customer-deploy.yml` / `owner-deploy.yml` / `admin-deploy.yml`: deploy to Azure on pushes to
  `main`. Each is skipped until its Azure web app is configured; see
  [kamu/docs/azure-deployment.md](kamu/docs/azure-deployment.md) and
  [kamu_restaurants/docs/azure-deployment.md](kamu_restaurants/docs/azure-deployment.md).

Day-to-day work happens on `dev`. Merging into `main` deploys.

## Moderation (owners and reports)

Restaurant owners are verified once by an admin, then post freely. Customers
can report listings and menu items, and admins handle both in
[`kamu_admin/`](kamu_admin). The database contract it builds on is in
[kamu/docs/owner-verification-and-reports.md](kamu/docs/owner-verification-and-reports.md).
