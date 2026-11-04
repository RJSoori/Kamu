// node --experimental-strip-types --test supabase/functions/triage-report/suggestion.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSuggestion } from "./suggestion.ts";

const item = { hasMenuItem: true, hasOwner: true };

test("parses a valid reply, with or without a ```json fence", () => {
  const reply = '{"action":"hide_menu_item","confidence":"high","summary":"Fake item.","reasons":["a"],"note_for_owner":"Please fix."}';
  for (const text of [reply, "```json\n" + reply + "\n```"]) {
    assert.deepEqual(parseSuggestion(text, item), {
      action: "hide_menu_item",
      confidence: "high",
      summary: "Fake item.",
      reasons: ["a"],
      note_for_owner: "Please fix.",
    });
  }
});

test("unknown actions and impossible ones become needs_human", () => {
  assert.equal(parseSuggestion('{"action":"delete_everything"}', item).action, "needs_human");
  assert.equal(
    parseSuggestion('{"action":"hide_menu_item"}', { hasMenuItem: false, hasOwner: true }).action,
    "needs_human",
  );
  assert.equal(
    parseSuggestion('{"action":"suspend_owner"}', { hasMenuItem: false, hasOwner: false }).action,
    "needs_human",
  );
});

test("non-JSON keeps the text as the summary", () => {
  const s = parseSuggestion("I think this should be dismissed.", item);
  assert.equal(s.action, "needs_human");
  assert.equal(s.confidence, "low");
  assert.equal(s.summary, "I think this should be dismissed.");
});

test("bad field types are cleaned up", () => {
  const s = parseSuggestion('{"action":"dismiss","confidence":"very","reasons":"x","note_for_owner":5}', item);
  assert.deepEqual(s, { action: "dismiss", confidence: "low", summary: "", reasons: [], note_for_owner: null });
});
