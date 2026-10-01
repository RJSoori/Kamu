// Public search: embeds the caller's free-text mood/craving query and ranks
// restaurants against it via the match_restaurants Postgres function
// (supabase/migrations/20260907120000_mood_search.sql).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedText } from "../_shared/embeddings.ts";

const MATCH_COUNT = 8;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let query: string;
  try {
    const body = await req.json();
    query = String(body.query ?? "").trim();
    if (!query) throw new Error();
  } catch {
    return json({ error: "Body must be { query: string }" }, 400);
  }

  // Forward whatever the caller sent (a logged-in customer's session, or the
  // anon key for a logged-out visitor) so match_restaurants sees the same
  // role restaurants_select_published_or_admin would -- search results never
  // leak unpublished restaurants to the public.
  const authHeader =
    req.headers.get("Authorization") ??
    `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const embedding = await embedText(query);

  const { data, error } = await supabase.rpc("match_restaurants", {
    query_embedding: embedding,
    match_count: MATCH_COUNT,
  });

  if (error) {
    return json({ error: error.message }, 500);
  }

  return json({ results: data ?? [] });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
