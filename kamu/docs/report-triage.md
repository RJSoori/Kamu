# Report triage (the admin agent)

On kamu_admin's **Reports** page, each open report has an **Investigate with
AI** button. A tool-calling agent looks into the report and suggests one
action: dismiss, hide the menu item, hide the restaurant, suspend the owner,
or "needs your judgement". It explains why and drafts a note for the owner.

It only suggests. Acting on it is still the existing Hide / Suspend /
Resolve / Dismiss controls. That's the design: a human in the loop for
anything that affects an owner.

## How it works

1. The button calls `triageReportAction` (`kamu_admin/src/app/(protected)/reports/actions.ts`),
   which calls the `triage-report` Edge Function
   (`supabase/functions/triage-report/index.ts`) with the admin's session.
2. The function refuses non-admins (`is_admin()`), loads the report and the
   listing or menu item it's about, and hands Gemini that "case file".
3. **The loop** (same as Ask Kamu): Gemini picks tools, the code runs them,
   up to 5 rounds; the last round must answer.
4. Gemini answers in JSON. `suggestion.ts` checks it like user input:
   unknown or impossible actions become "needs your judgement".
5. The admin app saves it in `report_triage` (one row per report, the latest
   run) and shows it on the report.

## Tools (all read-only, no parameters)

| Tool | What it checks |
|---|---|
| `get_report_history` | Other reports on this restaurant and how admins handled them |
| `get_reporter_history` | How many reports this reporter filed and how they ended |
| `get_owner` | The owner's account status and their other listings |
| `get_menu` | The full menu, including hidden items |
| `get_reviews` | The 15 latest reviews |

The tools take no arguments: each one looks at *this* report's restaurant,
reporter or owner. The model decides which to check, never where to look.

## Safety

- **Admins only, via RLS:** the function runs with the admin's token, so it
  reads exactly what that admin could. No service-role key.
- **Customers can't plant suggestions:** suggestions live in their own
  admin-only table (`report_triage`), not on `content_reports`, which
  customers can insert into. Tested in `supabase/tests/database/report_triage.test.sql`.
- **Prompt injection:** report text, listings, menus and reviews are written
  by customers and owners. The prompt says to treat them as data, the
  tools can't be pointed elsewhere, and the agent can't act. The worst a
  crafted report can do is produce a bad suggestion that an admin reads.
- **Sent to Google:** the report, the listing, menus, reviews, earlier
  admin notes, and counts of the reporter's reports. Never ids, emails or
  names of the reporter or owner.

## Setup

```bash
npx supabase db push --remote                 # report_triage table (CLI v3: local by default)
npx supabase functions deploy triage-report   # uses the existing GEMINI_API_KEY
```

Tests: `npx supabase test db` (RLS) and
`node --experimental-strip-types --test supabase/functions/triage-report/suggestion.test.ts`
(the JSON checker).

## Limits

- Each run uses up to 5 Gemini requests and takes 30-90s. It runs only when
  an admin clicks, never on every new report, so spam reports can't burn
  the free quota.
- No evals yet. Ask Kamu's `evals/ask-kamu.mjs` is the pattern to copy:
  sample reports with the action you'd expect.
