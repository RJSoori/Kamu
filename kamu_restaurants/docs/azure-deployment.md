# Azure App Service Deployment

The owner portal deploys exactly like the customer app (see
[`../kamu/docs/azure-deployment.md`](../../kamu/docs/azure-deployment.md)):
a plain Node.js server (`next start`) on **Azure App Service (Linux)**. No
adapter, no Docker, no static export. Supabase stays the backend; Azure only
hosts the Next.js server.

It runs as a **second web app on the customer app's existing App Service
plan** (`kamu-plan`), so it adds no plan cost. If the free F1 tier's sleep or
CPU quotas start hurting, scale the shared plan up to B1 (~$13/mo), which
covers both apps.

## One-time resource setup

Requires the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli),
logged in (`az login`). Assumes `kamu-rg` and `kamu-plan` already exist from
the customer app's setup; the names are examples.

```bash
# Web app on the shared plan, Node 22 runtime (Node 20 reached end-of-life
# in April 2026)
az webapp create \
  --name kamu-restaurants-app \
  --resource-group kamu-rg \
  --plan kamu-plan \
  --runtime "NODE:22-lts"
```

### App settings (environment variables)

These map 1:1 to [.env.example](../.env.example). They are the **same
values** as the customer app's, because both apps share one Supabase project.
Unlike the customer app, there's no service-role key here: everything this app
does goes through the signed-in owner's session and RLS.

```bash
az webapp config appsettings set \
  --name kamu-restaurants-app \
  --resource-group kamu-rg \
  --settings \
    NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

`SCM_DO_BUILD_DURING_DEPLOYMENT=true` makes Azure's Oryx builder run
`npm install && npm run build` on the server after each deploy, with the app
settings above as build-time env vars, so `NEXT_PUBLIC_*` values get inlined
correctly.

### Startup command

```bash
az webapp config set \
  --name kamu-restaurants-app \
  --resource-group kamu-rg \
  --startup-file "npm run start"
```

`next start` honors the `PORT` env var Azure injects. The `-p 3001` in the
`dev` script only affects local development.

### Publish profile (for CI/CD)

```bash
az webapp deployment list-publishing-profiles \
  --name kamu-restaurants-app \
  --resource-group kamu-rg \
  --xml
```

In the Kamu GitHub repo (Settings → Secrets and variables → Actions). The
names are prefixed `AZURE_OWNER_` because the customer app deploys from the
same repo with its own `AZURE_WEBAPP_*` pair:

- secret `AZURE_OWNER_WEBAPP_PUBLISH_PROFILE`: the full XML output above
- variable `AZURE_OWNER_WEBAPP_NAME`: `kamu-restaurants-app`

[.github/workflows/owner-deploy.yml](../../.github/workflows/owner-deploy.yml)
(at the repo root) reads both. Until the variable exists, the deploy job is
skipped rather than failing.

## Supabase Auth redirect URLs

Owner sign-up confirmation emails link back to `/auth/confirm` on this app.
Supabase only redirects to allow-listed URLs, so add these in Supabase
Dashboard → Authentication → URL Configuration → Redirect URLs:

- `https://kamu-restaurants-app.azurewebsites.net/auth/confirm`
- `http://localhost:3001/auth/confirm` (local dev)

If they're missing, Supabase falls back to the project's Site URL (the
customer app). The owner's email still gets confirmed, and logging in here
afterwards still finishes their owner registration (see
`src/app/(marketing)/login/actions.ts`). They just land on the wrong site first.

## How deploys happen

This app lives in `kamu_restaurants/` of the single Kamu repo. Every push to
`main` that changes something under `kamu_restaurants/` (other than `docs/`)
triggers the deploy workflow. It zips the `kamu_restaurants/` folder
(excluding `node_modules`, `.next`), so the app sits at the root of the
package, and hands it to `azure/webapps-deploy`. Oryx then builds and
restarts the app. Changes that only touch the customer app don't redeploy
this one. `workflow_dispatch` is enabled for manual redeploys.
[owner-ci.yml](../../.github/workflows/owner-ci.yml)
(lint/typecheck/test/build) runs on every PR and `main` push that touches
`kamu_restaurants/`, as a separate correctness gate.

## Rollback and logs

```bash
az webapp deployment list --name kamu-restaurants-app --resource-group kamu-rg -o table
az webapp log tail --name kamu-restaurants-app --resource-group kamu-rg
```

Or redeploy an older commit via `workflow_dispatch` on that ref.
