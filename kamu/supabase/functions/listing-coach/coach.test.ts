// node --experimental-strip-types --test supabase/functions/listing-coach/coach.test.ts
// The agent loop with a scripted fake Gemini: no network, no quota.
import assert from "node:assert/strict";
import { test } from "node:test";
import { startCoach, type Step, stepCoach } from "./coach.ts";
import type { Facts } from "../_shared/listing.ts";

const facts: Facts = {
  listing: { name: "Lagoon Crab Shack", area: "Negombo", cuisine: ["Seafood"], price: "$$" },
  menu: [],
  reviews: [{ rating: 5, review_text: "Quiet spot by the lagoon, great for families" }],
  description: "",
};

const call = (name: string, args: Record<string, unknown> = {}) => ({
  role: "model" as const,
  parts: [{ functionCall: { name, args, id: name } }],
});

/** Returns the scripted replies in order and records each request. */
function fakeGemini(replies: unknown[]) {
  const requests: { options: Record<string, unknown> }[] = [];
  const gemini = async (options: Record<string, unknown>) => {
    requests.push({ options });
    const next = replies.shift();
    if (!next) throw new Error("script ran out");
    return next;
  };
  return { gemini: gemini as never, requests };
}

test("looks, asks, pauses, resumes with the answer, checks, proposes", async () => {
  const { gemini } = fakeGemini([
    { role: "model", parts: [{ functionCall: { name: "get_listing", args: {} } }, { functionCall: { name: "get_reviews", args: {} } }] },
    call("ask_owner", { criterion: "signature_dish", question: "What's the must-try dish?", options: ["Crab curry"] }),
    // after resuming:
    call("check_description", { text: "A quiet lagoon-side seafood place in Negombo, loved by families for its crab curry." }),
    { role: "model", parts: [{ text: '{"atmosphere":true,"suits_who":true,"signature_dish":true,"special":true}' }] },
    call("propose_description", {
      description: "A quiet lagoon-side seafood place in Negombo, loved by families for its crab curry.",
      sources: [{ claim: "quiet, families", from: "reviews" }, { claim: "crab curry", from: "owner" }, { claim: "x", from: "made-up" }],
    }),
  ]);

  let state = startCoach(facts);
  let steps: Step[] = [];
  const first = await stepCoach(state, steps, null, gemini);
  assert.deepEqual(first, { type: "question", criterion: "signature_dish", question: "What's the must-try dish?", options: ["Crab curry"] });

  // Saved to the database and loaded back between requests.
  ({ state, steps } = JSON.parse(JSON.stringify({ state, steps })));
  const second = await stepCoach(state, steps, "Crab curry", gemini);

  assert.equal(second.type, "proposal");
  assert.deepEqual(second.type === "proposal" && second.sources, [
    { claim: "quiet, families", from: "reviews" },
    { claim: "crab curry", from: "owner" },
  ]);
  assert.deepEqual(steps.map((s) => s.tool), ["get_listing", "get_reviews", "ask_owner", "check_description", "propose_description"]);
  // The answer went back as ask_owner's result, alongside nothing else pending.
  const answerTurn = state.contents.find((c) =>
    c.parts.some((p) => p.functionResponse?.name === "ask_owner")
  );
  assert.deepEqual(answerTurn?.parts.at(-1).functionResponse.response, { answer: "Crab curry" });
});

test("a 4th question is refused and the last round must propose", async () => {
  const replies = [];
  for (let i = 0; i < 7; i++) replies.push(call("ask_owner", { criterion: "special", question: "Anything special?" }));
  replies.push(call("propose_description", { description: "Seafood in Negombo. [add what makes it special]", sources: [] }));
  const { gemini, requests } = fakeGemini(replies);

  const state = startCoach(facts);
  state.questions = 3;
  const outcome = await stepCoach(state, [], null, gemini);

  assert.equal(outcome.type, "proposal");
  assert.equal(state.rounds, 8);
  assert.deepEqual(
    (requests.at(-1)?.options.toolConfig as { functionCallingConfig: unknown }).functionCallingConfig,
    { mode: "ANY", allowedFunctionNames: ["propose_description"] },
  );
  const refusal = state.contents[2].parts[0].functionResponse.response;
  assert.match(refusal.error, /No more questions/);
});
