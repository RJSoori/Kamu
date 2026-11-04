// Listing help, Version 2 (the agent): coach.ts does the thinking; this file
// handles who's calling and saving the paused conversation.
//   { action: "start", form, description, restaurant_id? }
//   { action: "answer", session_id, answer }
// Both return { session_id, outcome, steps }; outcome is a question for the
// owner, a proposal, or a failure. See docs/listing-coach.md.
//
// The conversation lives in coach_sessions and never goes to the browser:
// the owner only ever sends an answer string, so they can't fake what the
// tools returned. Owners can read their sessions, only this function
// (service role) writes them.
import { hasGeminiKey } from "../_shared/gemini.ts";
import { loadFacts } from "../_shared/listing-facts.ts";
import { activeOwner, LIMIT_REACHED, type OwnerCaller, takeDailyQuota } from "../_shared/owner.ts";
import { type CoachOutcome, type CoachState, startCoach, type Step, stepCoach } from "./coach.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  if (!hasGeminiKey()) {
    return json({ error: "The coach is unavailable right now. You can still save." }, 503);
  }

  const owner = await activeOwner(req);
  if (owner instanceof Response) return owner;

  if (body?.action === "start") {
    const loaded = await loadFacts(owner, body);
    if ("error" in loaded) return json({ error: loaded.error }, 403);
    if (!(await takeDailyQuota(owner, "listing_coach"))) {
      return json({ error: LIMIT_REACHED }, 429);
    }
    const state = startCoach(loaded.facts);
    const { data: session, error } = await owner.service
      .from("coach_sessions")
      .insert({ owner_id: owner.ownerId, restaurant_id: loaded.restaurantId, state })
      .select("id")
      .single();
    if (error) {
      console.error("listing-coach: couldn't create session", error);
      return json({ error: "The coach couldn't start. Try again." }, 500);
    }
    return run(owner, session.id, state, [], null);
  }

  if (body?.action === "answer") {
    const sessionId = String(body.session_id ?? "");
    const answer = typeof body.answer === "string" ? body.answer.trim().slice(0, 300) : "";
    if (!UUID.test(sessionId) || !answer) {
      return json({ error: "Body must be { session_id, answer }" }, 400);
    }
    // Claim the paused session (only ours, only if paused) so a double
    // click can't run it twice.
    const { data: session } = await owner.service
      .from("coach_sessions")
      .update({ status: "running", updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("owner_id", owner.ownerId)
      .eq("status", "waiting_for_owner")
      .select("state, steps")
      .maybeSingle();
    if (!session) return json({ error: "This coaching session has ended. Start again." }, 409);
    return run(owner, sessionId, session.state, session.steps, answer);
  }

  return json({ error: "action must be start or answer" }, 400);
});

async function run(
  owner: OwnerCaller,
  sessionId: string,
  state: CoachState,
  steps: Step[],
  answer: string | null,
): Promise<Response> {
  let outcome: CoachOutcome;
  try {
    outcome = await stepCoach(state, steps, answer);
  } catch (err) {
    console.error("listing-coach: step failed", err);
    outcome = {
      type: "failed",
      error: "The coach is busy right now (the free AI plan has a limit). Try again in a minute.",
    };
  }

  const status = outcome.type === "question" ? "waiting_for_owner" : outcome.type === "proposal" ? "done" : "failed";
  const { error } = await owner.service
    .from("coach_sessions")
    .update({ state, steps, status, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) console.error("listing-coach: couldn't save session", error);

  return json({ session_id: sessionId, outcome, steps });
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
