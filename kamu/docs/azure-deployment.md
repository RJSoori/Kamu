# Azure App Service Deployment

Kamu deploys as a plain Node.js server on **Azure App Service (Linux)**. Per
the bundled Next.js docs (`node_modules/next/dist/docs/01-app/01-getting-started/17-deploying.md`),
"Node.js server" is a fully-supported deployment target (Server Actions,
dynamic routes, everything) — no adapter, no Docker, no static export.

Supabase remains the backend (DB, Auth, Storage). Azure only hosts the
Next.js frontend/server.

## One-time resource setup

Requires the [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli),
logged in (`az login`). Pick names/region as appropriate — these are examples.

```bash
# Resource group
az group create --name kamu-rg --location southeastasia

# App Service plan (Linux). F1 is free but sleeps/has CPU quotas -- fine for
# soft-launch testing; move to B1 (~$13/mo) if that becomes a problem.
az appservice plan create \
  --name kamu-plan \
  --resource-group kamu-rg \
  --is-linux \
  --sku F1

# Web app, Node 22 runtime (Node 20 reached end-of-life in April 2026, so
# App Service no longer offers it for new apps)
az webapp create \
  --name kamu-app \
  --resource-group kamu-rg \
  --plan kamu-plan \
  --runtime "NODE:22-lts"
```

The restaurant owner portal (`../kamu_restaurants`) runs as a second web app
on this same `kamu-plan` -- see `kamu_restaurants/docs/azure-deployment.md`.

### App settings (environment variables)

These map 1:1 to [.env.example](../.env.example). Azure exposes App Settings
as environment variables both during the remote build (see below) and at
runtime, so `NEXT_PUBLIC_*` values get inlined correctly at build time.

```bash
az webapp config appsettings set \
  --name kamu-app \
  --resource-group kamu-rg \
  --settings \
    NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co" \
    NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon-key>" \
    SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
    NEXT_PUBLIC_MAPBOX_TOKEN="<mapbox-token>" \
    SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

`SCM_DO_BUILD_DURING_DEPLOYMENT=true` tells Azure's Oryx builder to run
`npm install && npm run build` on the server after each deploy, using the app
settings above as build-time env vars. GitHub Actions only ships source, not
a prebuilt bundle — keeps secrets in one place (Azure), not duplicated into
GitHub as well.

### Startup command

App Service doesn't reliably resolve a bare `next start` on PATH, so point
it at the npm script instead:

```bash
az webapp config set \
  --name kamu-app \
  --resource-group kamu-rg \
  --startup-file "npm run start"
```

`next start` itself already honors the `PORT` env var Azure injects, so no
further port configuration is needed.

### Publish profile (for CI/CD)

```bash
az webapp deployment list-publishing-profiles \
  --name kamu-app \
  --resource-group kamu-rg \
  --xml
```

Copy the full XML output into a new GitHub repo secret named
`AZURE_WEBAPP_PUBLISH_PROFILE` (Settings → Secrets and variables → Actions).
Also add a repo **variable** (not secret) named `AZURE_WEBAPP_NAME` set to
the app name (`kamu-app` above) — the deploy workflow
([.github/workflows/customer-deploy.yml](../../.github/workflows/customer-deploy.yml),
at the repo root) reads both. Until the variable exists, the deploy job is
skipped rather than failing.

The owner portal deploys from the same repo with its own secret/variable
pair (`AZURE_OWNER_WEBAPP_PUBLISH_PROFILE` / `AZURE_OWNER_WEBAPP_NAME`).

## How deploys happen

The whole project is one repo: this app lives in `kamu/`, next to the owner
portal in `kamu_restaurants/`. Every push to `main` that changes something
under `kamu/` (other than `docs/` and `supabase/`) triggers the deploy
workflow: it zips the `kamu/` folder (excluding `node_modules`, `.next`), so
the app sits at the root of the package exactly as App Service expects, and
hands it to `azure/webapps-deploy`. Oryx then builds and restarts the app
using the startup command above. Changes that only touch the owner portal
don't redeploy this app. `workflow_dispatch` is also enabled for manual
redeploys.

[customer-ci.yml](../../.github/workflows/customer-ci.yml)
(lint/typecheck/test/build) runs on every PR and `main` push that touches
`kamu/` — it's a correctness gate, separate from the deploy workflow.

## Rollback

App Service keeps prior deployments. To roll back:

```bash
az webapp deployment list --name kamu-app --resource-group kamu-rg -o table
az webapp deployment source config-zip --src <previous-release.zip> \
  --name kamu-app --resource-group kamu-rg
```

Or redeploy an older commit via `workflow_dispatch` on that ref.

## Logs

```bash
az webapp log tail --name kamu-app --resource-group kamu-rg
```

This is what `console.error` in [error.tsx](../src/app/error.tsx) ends up in
for server-side errors.
