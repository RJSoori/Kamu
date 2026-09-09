// Embeds one restaurant's vibe_description and writes it to
// restaurants.vibe_embedding. Called two ways:
//   - from the admin panel (forwards the admin's own session JWT) once
//     auto-embed-on-save is wired up there
//   - manually via curl/`supabase functions invoke` with the service-role
//     key, for one-off backfills of existing restaurants
//
// No admin check in this file on purpose: the client below is built from
// whatever Authorization header the caller sent, so restaurants_update_admin
// RLS decides for a user JWT, and the service-role key bypasses RLS
// entirely for a backfill -- same trust boundary as every other write path
// in this app (see src/lib/data/restaurants.ts).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedText } from "../_shared/embeddings.ts";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Missing Authorization header" }, 401);
  }

  let restaurantId: string;
  try {
    const body = await req.json();
    if (typeof body.restaurant_id !== "string" || !body.restaurant_id) {
      throw new Error();
    }
    restaurantId = body.restaurant_id;
  } catch {
    return json({ error: "Body must be { restaurant_id: string }" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: restaurant, error: fetchError } = await supabase
    .from("restaurants")
    .select("id, vibe_description")
    .eq("id", restaurantId)
    .maybeSingle();

  if (fetchError) {
    return json({ error: fetchError.message }, 500);
  }
  if (!restaurant) {
    return json(
      { error: "Restaurant not found (or not visible to this caller)" },
      404,
    );
  }
  if (!restaurant.vibe_description?.trim()) {
    return json({ error: "Restaurant has no vibe_description to embed" }, 422);
  }

  const embedding = await embedText(restaurant.vibe_description);

  const { error: updateError } = await supabase
    .from("restaurants")
    .update({ vibe_embedding: embedding })
    .eq("id", restaurantId);

  if (updateError) {
    // Most likely RLS rejecting a non-admin caller -- 403 reads better than
    // a raw Postgres error for that case.
    return json({ error: updateError.message }, 403);
  }

  return json({ ok: true });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
