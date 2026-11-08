import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface MoodSearchResult {
  id: string;
  name: string;
  area: string;
  cuisine_type: string[] | null;
  price_range: string | null;
  vibe_description: string | null;
  cover_photo_url: string | null;
  similarity: number;
  /** Closest menu-item/review chunks (up to 2), best first. */
  evidence: string[];
  /** True when a menu item/review (not the vibe) is what ranked it. */
  matched_on_evidence: boolean;
}

/**
 * Calls the mood-search Edge Function (supabase/functions/mood-search),
 * which embeds `query` with the same gte-small model used to embed each
 * restaurant's vibe_description, then ranks restaurants by pgvector cosine
 * distance, against both the vibe description and the restaurant's menu
 * items and reviews (search_chunks). Retrieval only, no AI writing: /ask
 * shows these instantly while the Ask Kamu agent works on the answer.
 * supabase.functions.invoke() forwards this client's session, so results
 * respect the same published/admin visibility RLS gives every other read.
 */
export async function searchByMood(query: string): Promise<MoodSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{
    results: MoodSearchResult[];
  }>("mood-search", {
    // The function's cap; a longer Ask Kamu question still searches fine.
    body: { query: query.slice(0, 300) },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.results ?? [];
}
