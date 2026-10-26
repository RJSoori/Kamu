// Embeds one restaurant's vibe_description and writes it to
// restaurants.vibe_embedding. Called three ways:
//   - from the owner portal (../kamu_restaurants) right after an owner saves
//     a changed vibe_description, forwarding the owner's own session JWT
//   - from the admin panel (forwards the admin's own session JWT) once
//     auto-embed-on-save is wired up there
//   - manually via curl/`supabase functions invoke` with the service-role
//     key, for one-off backfills of existing restaurants
//
// vibe_embedding can't be written by ordinary API callers: the
// restaurants_guard trigger (migrations/20261001120000_owner_verification_and_reports.sql)
// pins it, so an owner can't hand-pick a vector that ranks their restaurant
// first for every mood search. So this function does the authorization
// itself -- can_edit_restaurant() evaluated as the caller (admin, or the
// restaurant's active owner) -- and then reads/writes with a service-role
// client. A service_role caller (backfills) skips that check and its own
// token is used for the queries, so the database verifies it. (An exact
// match against SUPABASE_SERVICE_ROLE_KEY used to be the check here; the
// runtime's copy of that key isn't byte-identical to the dashboard's.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jwtRole } from "../_shared/auth.ts";
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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const isServiceRole = jwtRole(authHeader) === "service_role";
  if (!isServiceRole) {
    const caller = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: allowed, error: authError } = await caller.rpc(
      "can_edit_restaurant",
      { rid: restaurantId },
    );

    if (authError) {
      return json({ error: authError.message }, 500);
    }
    if (!allowed) {
      return json({ error: "Not allowed to edit this restaurant" }, 403);
    }
  }

  const admin = createClient(
    supabaseUrl,
    isServiceRole ? Deno.env.get("SUPABASE_ANON_KEY")! : serviceRoleKey,
    {
      auth: { persistSession: false },
      global: isServiceRole ? { headers: { Authorization: authHeader } } : {},
    },
  );

  const { data: restaurant, error: fetchError } = await admin
    .from("restaurants")
    .select("id, vibe_description")
    .eq("id", restaurantId)
    .maybeSingle();

  if (fetchError) {
    return json({ error: fetchError.message }, 500);
  }
  if (!restaurant) {
    return json({ error: "Restaurant not found" }, 404);
  }
  if (!restaurant.vibe_description?.trim()) {
    return json({ error: "Restaurant has no vibe_description to embed" }, 422);
  }

  const embedding = await embedText(restaurant.vibe_description);

  const { error: updateError } = await admin
    .from("restaurants")
    .update({ vibe_embedding: embedding })
    .eq("id", restaurantId);

  if (updateError) {
    return json({ error: updateError.message }, 500);
  }

  return json({ ok: true });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
