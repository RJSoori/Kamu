import "server-only";
import { createClient } from "@/lib/supabase/server";

/*
 * Calls to the owner AI Edge Functions in ../kamu/supabase/functions:
 * menu-import, listing-assist (Version 1, the workflow) and listing-coach
 * (Version 2, the agent). Each forwards the owner's session, so the
 * functions check the owner and their restaurant themselves. Never throws:
 * failures come back as { error } with a message for the owner.
 */

export type AiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface ImportedMenuItem {
  item_name: string;
  description: string | null;
  price: number | null;
  category: string | null;
  status: "new" | "price_change" | "unchanged";
  existing_id?: string;
  old_price?: number | null;
}

export interface Criterion {
  id: string;
  label: string;
  question: string;
  options: string[];
  met: boolean;
}

export interface ListingCheck {
  length_ok: boolean;
  min_length: number;
  criteria: Criterion[];
}

export interface Proposal {
  description: string;
  sources: { claim: string; from: string }[];
}

export type CoachOutcome =
  | { type: "question"; criterion: string; question: string; options: string[] }
  | ({ type: "proposal" } & Proposal)
  | { type: "failed"; error: string };

export interface CoachTurn {
  session_id: string;
  outcome: CoachOutcome;
  steps: { tool: string; detail: string }[];
}

/** The form values the AI may describe (see loadFacts in the functions). */
export interface ListingForm {
  name: string;
  area: string;
  cuisine_type: string;
  price_range: string;
}

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<AiResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error || !data) {
    const message = await error?.context?.json?.().then((b: { error?: string }) => b?.error).catch(() => null);
    if (!message) console.error(`${name} failed:`, error?.message);
    return { ok: false, error: message ?? "AI help is unavailable right now. You can still edit by hand." };
  }
  return { ok: true, data };
}

export function readMenuPhoto(restaurantId: string, photoPath: string) {
  return invoke<{ is_menu: boolean; items: ImportedMenuItem[] }>("menu-import", {
    restaurant_id: restaurantId,
    photo_path: photoPath,
  });
}

export function checkListing(description: string) {
  return invoke<ListingCheck>("listing-assist", { action: "check", description });
}

export function suggestListing(input: {
  restaurantId: string | null;
  form: ListingForm;
  description: string;
  answers: Record<string, string>;
}) {
  return invoke<{ proposal: Proposal }>("listing-assist", {
    action: "suggest",
    restaurant_id: input.restaurantId,
    form: input.form,
    description: input.description,
    answers: input.answers,
  });
}

export function startCoach(input: { restaurantId: string | null; form: ListingForm; description: string }) {
  return invoke<CoachTurn>("listing-coach", {
    action: "start",
    restaurant_id: input.restaurantId,
    form: input.form,
    description: input.description,
  });
}

export function answerCoach(sessionId: string, answer: string) {
  return invoke<CoachTurn>("listing-coach", { action: "answer", session_id: sessionId, answer });
}
