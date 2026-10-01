# The Mood-Based Restaurant Discovery Platform

**Product & Engineering Blueprint** — an end-to-end plan for a smart cafe & restaurant discovery web app.
Launch market: single city, Sri Lanka. Stage: idea only, no code written yet. Goal: cheapest possible to run.

This file is the single source of truth for the project. Any AI coding assistant or developer should read this in full before writing code.

---

## 1. Executive Summary

A web app where people discover cafes and restaurants based on **mood, craving, and vibe** — not just filters. A user types "somewhere quiet to read with coffee" or "spicy street food, cheap, casual" and gets ranked restaurant matches.

Restaurants are listed with menu, prices, and photos. Customers browse, save places to a personal **bucket list**, and leave reviews. Reviews feed back into improving the AI matching over time.

**Key decisions already made:**
- Launch scope: single city in Sri Lanka
- Listings are **admin-added**, not owner self-signup (control data quality first)
- Priority: cheapest possible to run (near-$0 to validate)
- Web app only for MVP — no native mobile

---

## 2. Problem & Vision

Existing apps (Google Maps, TripAdvisor) use static filters — cuisine, price, rating, distance — that force users to translate a feeling into clicks. Real dining decisions are mood-driven: "something comforting," "impress a date," "quick and cheap."

**Vision:** every listed restaurant has accurate, structured menu/pricing data; customers describe what they want in natural language; bucket lists and reviews build a personal food journal; the recommendation engine improves from real behavior over time.

**North star metric:** can a real person describe a craving in one sentence and end up somewhere they genuinely enjoyed?

---

## 3. Core Features (MVP Scope)

### Customer-facing
- Browse restaurants — list + map view, filter by area (dropdown) and cuisine
- Restaurant detail page — photos, full menu with prices, map pin, hours, rating
- **Mood/craving search** — free text box → ranked matching restaurants
- Bucket list — save restaurants, viewable after login
- Reviews — star rating + text, tied to logged-in account
- Auth — simple email or Google login (customers only)

### Admin-facing
- Add/edit/remove restaurants, menu items, prices, photos, area tags
- Write each restaurant's `vibe_description` (feeds the AI matcher — see Section 7)
- Basic stats: most-saved restaurants, common mood searches
- Verify restaurant owner accounts (one-time approval after they register)
- Review customer reports about owner-posted content, and hide content or suspend owners where needed

The admin portal is built by a teammate. The owner portal side only provides the database contract for it; see `kamu/docs/owner-verification-and-reports.md`.

### Restaurant-owner-facing (`kamu_restaurants`)
- Owners register, then wait for a **one-time admin verification** of their account
- While pending they can already build their listing; nothing is public until they're approved
- Once approved they post freely: listing details, menu, prices, photos, publish/unpublish
- Customers can **report** restaurants and menu items; reports are flagged in the admin portal, and an admin can hide individual items or suspend the owner

### Explicitly OUT of scope for MVP
- ~~Restaurant owner self-signup / owner dashboards~~ **Reversed 2026-09-11, refined 2026-10-01** — a separate owner-facing app (`kamu_restaurants`, sibling to `kamu`) covers this, with the verify-once + customer-report model above. See `kamu_restaurants/README.md`, `kamu/supabase/migrations/20260911120000_restaurant_owners.sql` and `kamu/supabase/migrations/20261001120000_owner_verification_and_reports.sql`.
- Payments, table booking, ordering
- Multi-city support
- Push notifications
- Native mobile apps

---

## 4. System Architecture

```
[ Customer's Browser ]                [ Restaurant Owner's Browser ]
        |                                          |
        v                                          v
[ kamu: customer Next.js app ]        [ kamu_restaurants: owner portal ]
        |          |                               |
        |          +--> [ Mapbox ]                 |
        |               (maps, area pins)          |
        +-------------------+----------------------+
                            |   both hosted on Azure App Service (Linux),
                            |   one shared App Service plan
                            v
[ Supabase ]  <----- Postgres DB + Auth + Storage + pgvector, all in one
        |
        +--> restaurants, menu_items, reviews, customers, bucket_lists (tables)
        +--> restaurant/menu photos (storage buckets)
        +--> customer login sessions (auth)
        +--> restaurant "vibe" vectors (pgvector extension)

[ Edge Function: Mood Matcher ]  <----- small serverless function
        - takes user's mood/craving text
        - converts it into a vector (embedding)
        - compares it against restaurant vectors in Postgres
        - returns a ranked list of restaurant IDs
```

Supabase bundles four services (DB, auth, storage, vector search) into one free tier — this is the main reason the whole stack can run near-$0. The only custom backend code needed is the mood-matching Edge Function; everything else talks to Supabase directly from Next.js. Azure App Service only hosts the two Next.js servers (deployment steps: `kamu/docs/azure-deployment.md`, `kamu_restaurants/docs/azure-deployment.md`).

---

## 5. Tech Stack & Rationale

### Frontend
| Tool | Purpose | Why |
|---|---|---|
| Next.js (React) | Main app framework | SSR makes restaurant pages indexable by Google; runs as a plain Node.js server (`next start`) on Azure App Service |
| Tailwind CSS | Styling | Fast to build, no separate design system needed for MVP |
| React Query | Data fetching/caching | Simplifies loading states |

### Backend & Data
| Tool | Purpose | Why |
|---|---|---|
| Supabase | DB, auth, storage, vector search | Free tier: 500MB DB, 1GB storage, 50k MAU — covers MVP entirely |
| PostgreSQL | Core database | Industry standard, free inside Supabase |
| PostGIS extension | Location queries | Real "near me" queries, not naive lat/lng math |
| pgvector extension | AI similarity search | Stores vibe vectors in Postgres — no separate vector DB |

### AI Layer
| Tool | Purpose | Why |
|---|---|---|
| sentence-transformers (all-MiniLM-L6-v2) | Text → vector embeddings | Free, open-source, small, good enough accuracy |
| Supabase Edge Function | Runs matching logic | Serverless, scales to zero cost when unused |

### Other
| Tool | Purpose | Why |
|---|---|---|
| Mapbox | Maps | 50k free loads/month, more generous than Google Maps |
| Azure App Service (Linux, Node 22) | Hosts both Next.js apps on one shared plan | F1 free tier to start; deploys via GitHub Actions (`azure/webapps-deploy`) on every push to `main` |
| Postgres full-text search | Restaurant/dish search | Free, built-in — skip Meilisearch/Typesense until scale demands it |

**Deliberately postponed:** dedicated vector DB (Pinecone/Weaviate), dedicated search engine, paid embedding APIs (OpenAI), native mobile apps. (Owner dashboards were originally on this list; see the 2026-09-11 reversal in Section 3.)

---

## 6. Database Schema

### `restaurants`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | auto |
| name | text | |
| area | text | Neighborhood, e.g. "Nugegoda" — used as dropdown filter |
| address | text | |
| latitude / longitude | numeric | For map + PostGIS |
| cuisine_type | text[] | e.g. ["Sri Lankan", "Cafe"] |
| price_range | text | "$", "$$", "$$$" |
| vibe_description | text | Admin-written; source for AI embedding |
| vibe_embedding | vector(384) | pgvector column, auto-generated |
| opening_hours | jsonb | Structured per-day hours |
| cover_photo_url | text | Supabase Storage |
| created_at | timestamp | |

### `menu_items`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| restaurant_id | uuid (FK) | → restaurants.id |
| item_name | text | |
| description | text | |
| price | numeric | LKR |
| photo_url | text | optional |
| category | text | "Mains", "Beverages", "Desserts" |

### `customers`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | matches Supabase Auth user id |
| display_name | text | |
| email | text | managed by Supabase Auth |
| created_at | timestamp | |

### `reviews`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| restaurant_id | uuid (FK) | |
| customer_id | uuid (FK) | |
| rating | integer | 1–5 |
| review_text | text | |
| created_at | timestamp | |

### `bucket_lists`
| Column | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| customer_id | uuid (FK) | |
| restaurant_id | uuid (FK) | |
| saved_at | timestamp | |

Relationships: one restaurant → many menu_items, many reviews. One customer → many reviews, many bucket_list entries. Standard one-to-many, nothing exotic.

---

## 7. The AI Mood-Matching Engine

**Approach:** embedding-based semantic search.

Every piece of text can be converted into a **vector embedding** — a list of numbers representing meaning. Similar meanings produce similar vectors even without shared words. "Cozy place to read with coffee" can match "quiet corner cafe, soft lighting, good for working" despite no word overlap.

### Flow
1. Admin writes `vibe_description` per restaurant (e.g. "Laid-back rooftop cafe, great sunset views, quiet mornings, popular with students, affordable coffee")
2. Text → 384-number vector via `sentence-transformers/all-MiniLM-L6-v2`, stored in `restaurants.vibe_embedding`
3. Customer types a mood/craving search
4. Search text → vector, same model
5. pgvector compares search vector against every restaurant vector via cosine similarity
6. Restaurants ranked by similarity, returned to user

**Build this last**, after core browsing/listing works. With only 15–20 restaurants at launch, match quality depends on how well-written each `vibe_description` is — not model sophistication.

### Example query
```sql
SELECT id, name, area,
  1 - (vibe_embedding <=> '[user_search_vector]') AS similarity
FROM restaurants
ORDER BY similarity DESC
LIMIT 10;
```

### Improving over time
- Track what users click/save after a mood search
- Review low-performing searches (nothing saved) to spot description gaps
- Later: auto-generate part of `vibe_description` by summarizing reviews with an LLM

---

## 8. Build Roadmap

### Phase 0 — Setup (~2-3 days)
- Create Supabase project (free tier)
- Create Next.js project, connect to Supabase, deploy "Hello World" to Azure App Service
- Set up Mapbox account + test API key
- Create database tables from Section 6

### Phase 1 — Seed Real Data (~1 week)
- Visit 15–20 real cafes/restaurants in the launch city
- Photograph venue + menu, note real prices
- Write honest `vibe_description` for each
- Enter into Supabase (table editor UI is fine — no admin UI needed yet)

> This step doubles as real-world validation — direct conversations with owners will tell you if the idea resonates.

### Phase 2 — Public Browse Experience (~1-2 weeks)
- Restaurant list page: card view (photo, name, area, cuisine, price range)
- Area + cuisine filter dropdowns
- Restaurant detail page: menu, photos, map pin, hours
- No login required for browsing

### Phase 3 — Accounts, Bucket Lists & Reviews (~1 week)
- Supabase Auth (email + Google) for customers
- "Save to Bucket List" button
- "My Bucket List" page
- Review submission (rating + text) + display on restaurant pages

### Phase 4 — Mood-Matching AI (~1-2 weeks)
- Enable pgvector extension in Supabase
- Script to generate embeddings for all existing vibe_descriptions
- Edge Function: embed search text → query pgvector → return matches
- Frontend search box wired to the function
- Test extensively with varied real phrasing

### Phase 5 — Soft Launch (ongoing)
- Share with friends/family in the launch city
- Watch what people search and save
- Fix data quality issues reported by early users
- Only after this, consider Section 11 growth ideas

---

## 9. Cost Breakdown

| Item | Monthly Cost | Notes |
|---|---|---|
| Azure App Service (both Next.js apps, one shared plan) | $0 on F1, ~$13 on B1 | F1 sleeps when idle and has CPU quotas; move the shared plan to B1 when that hurts |
| Supabase (DB/auth/storage/vector) | $0 | 500MB DB, 1GB storage, 50k MAU free |
| Mapbox | $0 | Free up to 50k map loads/month |
| Embedding model (self-hosted) | $0 | Runs in free Edge Function |
| Domain name | ~$1/mo | ~$10–15/year |
| **Total** | **~$0–5/month on F1, ~$15–20/month on B1** | Until free tier limits are exceeded |

Costs increase once DB exceeds 500MB, MAU exceeds 50k, map loads exceed 50k/month, or the F1 App Service plan's sleep/CPU limits start hurting real users — all "good problems" signaling it's time for paid infra.

---

## 10. Localization Notes (Sri Lanka)

- **Currency:** LKR, proper thousand separators
- **Area filtering:** dropdown of neighborhoods (e.g. "Colombo 03", "Nugegoda", "Kotte") likely outperforms pure "near me" radius search
- **Language:** keep DB fields UTF-8 (default) to support Sinhala/Tamil later, even if MVP UI is English-only
- **Sharing:** WhatsApp share button likely outperforms generic social share buttons locally
- **Connectivity:** compress images, lazy-load menu photos for variable mobile data speeds

---

## 11. Growth & Differentiation Ideas (Post-MVP — do not build yet)

- Auto-generated vibe tags from reviews via LLM (vs. admin-only descriptions)
- Group decision mode — multiple people enter mood/craving, app finds best overlap
- Menu price history tracking
- Crowdsourced wait-time / busyness ("popular times" for this niche)
- Owner dashboard with analytics once owners want to self-manage
- Voice or photo mood input
- Allergy/dietary-aware ranking woven into similarity search, not just a checkbox

---

## 12. Risks & Open Questions

| Risk / Question | Why it matters |
|---|---|
| Will restaurants agree to be listed without self-managing? | Get informal buy-in during data collection, especially around displayed prices |
| How is `vibe_description` quality maintained as more restaurants are added? | Consider a lightweight style guide/template |
| What happens when a restaurant closes or changes menu/prices? | Needs a periodic refresh process, manual is fine at MVP stage |
| When does owner self-signup become necessary? | Likely once traffic grows and owners request it — revisit after Phase 5 |

---

## 13. Glossary

- **MVP** — Minimum Viable Product, smallest testable version
- **Embedding / Vector** — numbers representing text meaning, comparable mathematically
- **Cosine similarity** — measures closeness of two vectors; core math behind mood matching
- **pgvector** — free Postgres extension for storing/searching vectors
- **PostGIS** — free Postgres extension for location/distance queries
- **Edge Function** — small on-demand backend code, no server to maintain, costs only when used
- **Supabase** — managed DB + auth + storage + vector search bundle, free to start
- **Bucket list** (this app) — a customer's personal saved list of restaurants

---

## Implementation Notes for AI Coding Assistants

- Follow the phase order in Section 8 — do not jump ahead to Phase 4 (AI matching) before Phases 0–3 are working.
- Use the exact table/column names in Section 6 for consistency.
- Default to free-tier tools listed in Section 5 unless explicitly told otherwise.
- Ask before introducing new paid services or dependencies not listed here.
