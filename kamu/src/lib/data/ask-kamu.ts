import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RestaurantCardData } from "@/components/site/RestaurantCard";

export interface AskKamuResult {
  /** Gemini's answer, or null when it failed (see `error`). */
  answer: string | null;
  /** Plain-language list of the tools the agent used, in order. */
  steps: string[];
  /** Restaurants the answer names, for cards under it. */
  restaurants: RestaurantCardData[];
  error: string | null;
}

/**
 * Calls the ask-kamu Edge Function (supabase/functions/ask-kamu), the
 * tool-calling agent. Forwards this client's session like searchByMood, so
 * the agent sees only what this visitor could. Slow: 30-60s on the free
 * Gemini tier. Never throws -- failures come back as `error`.
 */
export async function askKamu(question: string): Promise<AskKamuResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{
    answer: string;
    steps: string[];
    restaurants: RestaurantCardData[];
  }>("ask-kamu", { body: { question } });

  if (error) {
    // Non-2xx: the function's JSON body has a friendly message and any
    // steps it got through.
    const body = await error.context?.json?.().catch(() => null);
    return {
      answer: null,
      steps: body?.steps ?? [],
      restaurants: [],
      error: body?.error ?? "Kamu couldn't answer that right now.",
    };
  }

  return {
    answer: data?.answer ?? null,
    steps: data?.steps ?? [],
    restaurants: data?.restaurants ?? [],
    error: null,
  };
}
