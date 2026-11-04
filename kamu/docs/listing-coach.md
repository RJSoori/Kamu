# Listing help: workflow vs agent

Owners get help writing their **vibe description** (what mood search reads).
It's built twice on purpose, to compare a fixed workflow with an agent on the
same test set. The plan was `docs/listing-coach-plan.md` (repo root).

Both appear under the description box in the owner app (`ListingHelper`):

| | Version 1: **Check my description** | Version 2: **Coach me** |
|---|---|---|
| Type | Workflow (same steps every time) | Agent (decides its own steps) |
| Steps | Check → ask about every missing criterion → write | Reads listing, menu, reviews → asks only what it couldn't find → checks its own draft → proposes |
| Code | `supabase/functions/listing-assist/` | `supabase/functions/listing-coach/` |
| AI calls | 2 | 3-9 |

Both only suggest. **Use this** fills the box; the owner still saves.

## Shared pieces

- **Criteria** (`supabase/functions/_shared/listing.ts`, one list used by
  everything): atmosphere, who it suits, a signature dish, what makes it
  special. Plus a plain-code rule: at least 80 characters, now required when
  an owner saves (`kamu_restaurants/src/lib/validation/restaurant.ts`).
  Existing listings aren't blocked; the rule applies on their next save.
- **Structured output:** the checker and writer use Gemini's JSON mode with a
  schema; the agent ends by calling `propose_description`, whose arguments
  have a schema. Code checks the result either way (`parseProposal`).
- **Grounding:** both may only use the listing, menu, reviews and the owner's
  answers, must use `[placeholders]` for anything unknown, and list where
  every claim came from. The owner sees the sources under the suggestion.

## The agent's new trick: pausing

When the agent calls `ask_owner`, the loop stops, the conversation is saved
in `coach_sessions`, and the question goes to the screen. The owner's answer
comes back as that tool's result and the loop continues. The conversation
stays on the server (only this function writes it, with the service role),
so the browser can't fake tool results. `steps` in the same row is the trace
of every tool call. Tested with a scripted fake Gemini in `coach.test.ts`.

Limits: 8 rounds, 3 questions, and the last round may only propose.

## Safety

- Owner checks and the daily limit live in `_shared/owner.ts`: active owners
  only, their own restaurant only (`can_edit_restaurant`), 20 uses of listing
  help per owner per 24 hours (`owner_ai_usage`, which owners can read but
  not write).
- Owner text, menus and reviews are data, not instructions; two eval cases
  test injection.
- AI down or limit reached: the panel says so, and saving still works.

## The head-to-head

```bash
# kamu/.env.local needs GEMINI_API_KEY (same key as the Supabase secret)
npm run eval:listing                    # both versions, 20 cases
npm run eval:listing -- --only junk     # a few cases
```

`evals/listing-coach/cases.json` has 20 hand-labelled cases: 4 good, 6
missing 1-3 criteria, 3 junk, 3 tricky ("family recipe" isn't about
families), 2 prompt injections, 2 empty listings. The runner calls the
functions' own code directly against Gemini (no deploy or login), answers
the agent's questions from each case's `owner_answers`, has a second Gemini
call judge invented facts (**LLM-as-judge**), and saves everything to
`evals/results/`. Spot-check the judge by reading what it flagged.

**Decision rule (set before seeing results, so it's fair):**
- If the agent has **any** invented facts and V1 doesn't: keep V1.
- If the agent asks noticeably fewer questions with equal quality: ship the
  agent and keep V1 as its fallback.
- If they're about equal: keep V1. It's cheaper, faster and simpler.

### Results

Not run yet. Paste the table the runner prints here, then apply the rule.

| Score | Version 1 (workflow) | Version 2 (agent) |
|---|---|---|
| Checker accuracy (shared) | | |
| Invented facts (target 0) | | |
| Criteria met after suggestion | | |
| Avg owner questions | | |
| Avg AI calls / seconds | | |

**Decision:** _pending_

## Setup

```bash
npx supabase db push --remote
npx supabase functions deploy listing-assist
npx supabase functions deploy listing-coach
node --experimental-strip-types --test supabase/functions/listing-coach/coach.test.ts
```

Not built (from the plan): the optional Ollama experiment, and deleting
`coach_sessions` older than 30 days (`delete from coach_sessions where
created_at < now() - interval '30 days'` by hand until it matters).
