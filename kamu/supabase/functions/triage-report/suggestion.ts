// The triage agent's final answer, checked like user input. Plain TS (no
// Deno APIs) so suggestion.test.ts runs under Node too.

export const ACTIONS = [
  "dismiss",
  "hide_menu_item",
  "hide_restaurant",
  "suspend_owner",
  "needs_human",
];

export interface Suggestion {
  action: string;
  confidence: string;
  summary: string;
  reasons: string[];
  note_for_owner: string | null;
}

/**
 * Unknown or impossible actions (hiding an item on a listing report,
 * suspending a listing with no owner) become "needs_human". So do
 * unparseable replies, with the raw text kept as the summary so the admin
 * still sees the reasoning.
 */
export function parseSuggestion(
  text: string,
  target: { hasMenuItem: boolean; hasOwner: boolean },
): Suggestion {
  const fallback: Suggestion = {
    action: "needs_human",
    confidence: "low",
    summary: text.slice(0, 600),
    reasons: [],
    note_for_owner: null,
  };
  let raw;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return fallback;
  }
  if (typeof raw !== "object" || raw === null) return fallback;

  let action = ACTIONS.includes(raw.action) ? raw.action : "needs_human";
  if (
    (action === "hide_menu_item" && !target.hasMenuItem) ||
    (action === "suspend_owner" && !target.hasOwner)
  ) {
    action = "needs_human";
  }
  return {
    action,
    confidence: ["low", "medium", "high"].includes(raw.confidence) ? raw.confidence : "low",
    summary: String(raw.summary ?? "").slice(0, 600),
    reasons: Array.isArray(raw.reasons)
      ? raw.reasons.slice(0, 6).map((r: unknown) => String(r).slice(0, 300))
      : [],
    note_for_owner: typeof raw.note_for_owner === "string"
      ? raw.note_for_owner.slice(0, 500)
      : null,
  };
}
