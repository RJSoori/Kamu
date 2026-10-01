# Mood Search

Free-text "vibe" search: type a craving, get ranked restaurants. Runs
entirely on Supabase's side (Postgres + Edge Functions) — Next.js just calls
one Edge Function and renders what comes back.

## How it works

1. `restaurants.vibe_description` gets embedded into a 384-dim vector
   (`gte-small`, a small model built into the Supabase Edge Runtime — no
   external API, no API key, no per-call cost) and stored in
   `restaurants.vibe_embedding` (already `vector(384)` since the foundations
   migration — that column size is what pins the model choice).
2. A search query gets embedded the same way, then compared against every
   restaurant's `vibe_embedding` via pgvector cosine distance
   (`match_restaurants` in
   [20260907120000_mood_search.sql](../supabase/migrations/20260907120000_mood_search.sql)).
3. [src/app/(site)/search/page.tsx](../src/app/(site)/search/page.tsx) is a
   plain GET form (`?q=...`) that calls
   [searchByMood](../src/lib/data/mood-search.ts), which invokes the
   `mood-search` Edge Function and renders whatever comes back.

## Files

- `supabase/migrations/20260907120000_mood_search.sql` — the `match_restaurants` RPC
- `supabase/functions/_shared/embeddings.ts` — the `gte-small` wrapper, shared by both functions below
- `supabase/functions/embed-restaurant/` — text → vector, writes `vibe_embedding` for one restaurant
- `supabase/functions/mood-search/` — query text → vector → ranked restaurants (public, no login required)

`supabase/functions/**` is intentionally excluded from this project's
`tsconfig.json`/ESLint — it's Deno code (remote-URL imports, `Deno`/`Supabase`
globals), a different runtime from the rest of the app, and isn't
type-checked by `npm run typecheck`.

## Deploying (I can't do this part — no Supabase CLI login available here)

```bash
# One-time: authenticates the CLI (opens a browser)
npx supabase login

# One-time: points this repo at your actual project
npx supabase link --project-ref iznmqgpcpslnmsjmxbpo

# Applies the new migration (match_restaurants)
npx supabase db push

# Deploys both Edge Functions
npx supabase functions deploy embed-restaurant
npx supabase functions deploy mood-search
```

## Backfill: embedding your existing restaurants

Nothing is searchable until each restaurant's `vibe_embedding` is populated
— it's `null` for every row right now. `embed-restaurant` doesn't gate on
admin status itself (see the comment in its `index.ts`); it just forwards
whatever `Authorization` header it's given and lets RLS decide, so with
admin bootstrap still parked, use the service-role key directly for now:

```bash
curl -X POST \
  "https://iznmqgpcpslnmsjmxbpo.supabase.co/functions/v1/embed-restaurant" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY from .env.local>" \
  -H "Content-Type: application/json" \
  -d '{"restaurant_id": "<id from the restaurants table>"}'
```

Repeat per restaurant. Once admin is unparked, the natural follow-up is
wiring this into the admin save flow (call `embed-restaurant` after
create/update instead of doing it by hand) — not done yet, out of scope for
this pass.

## Testing it

Once backfilled, `/search` works with the same kind of queries the plan's
QA checklist calls out — try `quiet place to read`, `spicy street food`,
`romantic date`, `cheap fast food` — and check the ranking looks sane for
what's actually in the `vibe_description` text you wrote.
