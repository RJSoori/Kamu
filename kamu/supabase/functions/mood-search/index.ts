// Public search: embeds the caller's free-text mood/craving query and ranks
// restaurants against it via the match_restaurants Postgres function
// (supabase/migrations/20260907120000_mood_search.sql). Retrieval only, no
// Gemini: /ask shows these matches straight away while the Ask Kamu agent
// (which starts from the same search) writes the answer.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedText } from "../_shared/embeddings.ts";

const MATCH_COUNT = 8;
const MAX_QUERY_LENGTH = 300;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let query: string;
  let area: string | null;
  let price: string | null;
  try {
    const body = await req.json();
    query = String(body.query ?? "").trim();
    // Optional exact-match filters.
    area = body.area ? String(body.area).slice(0, 100) : null;
    price = body.price ? String(body.price).slice(0, 10) : null;
    if (!query) throw new Error();
  } catch {
    return json(
      { error: "Body must be { query: string, area?: string, price?: string }" },
      400,
    );
  }
  // Public endpoint: a mood is one sentence, and embedding huge text burns
  // the free tier's Edge Function time.
  if (query.length > MAX_QUERY_LENGTH) {
    return json({ error: `Keep it under ${MAX_QUERY_LENGTH} characters` }, 400);
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
    filter_area: area,
    filter_price: price,
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
