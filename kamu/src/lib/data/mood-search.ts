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
}

/**
 * Calls the mood-search Edge Function (supabase/functions/mood-search),
 * which embeds `query` with the same gte-small model used to embed each
 * restaurant's vibe_description, then ranks restaurants by pgvector cosine
 * distance. supabase.functions.invoke() forwards this client's session
 * automatically, so results respect the same published/admin visibility
 * RLS gives every other restaurant read.
 */
export async function searchByMood(query: string): Promise<MoodSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke<{
    results: MoodSearchResult[];
  }>("mood-search", { body: { query } });

  if (error) {
    throw new Error(error.message);
  }

  return data?.results ?? [];
}
