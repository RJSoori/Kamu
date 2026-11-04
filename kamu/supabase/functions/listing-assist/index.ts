// Listing help, Version 1 (the workflow): the same fixed steps every time.
//   { action: "check", description }       -> which criteria are covered
//   { action: "suggest", form, description, answers, restaurant_id? }
//                                           -> a grounded suggestion
// See docs/listing-coach.md. Advice only: nothing is saved here, and the
// owner can always save without it.
import { hasGeminiKey } from "../_shared/gemini.ts";
import { checkDescription, CRITERIA, type CriterionId, MIN_DESCRIPTION_LENGTH, suggestDescription } from "../_shared/listing.ts";
import { loadFacts } from "../_shared/listing-facts.ts";
import { activeOwner, LIMIT_REACHED, takeDailyQuota } from "../_shared/owner.ts";

const UNAVAILABLE = "Suggestions are unavailable right now. You can still save.";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  // deno-lint-ignore no-explicit-any
  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Body must be JSON" }, 400);
  }
  if (body?.action !== "check" && body?.action !== "suggest") {
    return json({ error: "action must be check or suggest" }, 400);
  }
  if (!hasGeminiKey()) return json({ error: UNAVAILABLE }, 503);

  const owner = await activeOwner(req);
  if (owner instanceof Response) return owner;
  if (!(await takeDailyQuota(owner, body.action === "check" ? "listing_check" : "listing_suggest"))) {
    return json({ error: LIMIT_REACHED }, 429);
  }

  try {
    if (body.action === "check") {
      const result = await checkDescription(String(body.description ?? ""));
      return json({
        length_ok: result.length_ok,
        min_length: MIN_DESCRIPTION_LENGTH,
        criteria: CRITERIA.map((c) => ({ ...c, met: result.met[c.id] })),
      });
    }

    const loaded = await loadFacts(owner, body);
    if ("error" in loaded) return json({ error: loaded.error }, 403);
    // Only known criteria, short answers: they go into the prompt.
    const answers: Partial<Record<CriterionId, string>> = {};
    for (const c of CRITERIA) {
      const answer = body.answers?.[c.id];
      if (typeof answer === "string" && answer.trim()) answers[c.id] = answer.trim().slice(0, 200);
    }
    return json({ proposal: await suggestDescription(loaded.facts, answers) });
  } catch (err) {
    console.error(`listing-assist: ${body.action} failed`, err);
    return json({ error: UNAVAILABLE }, 503);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
