// Embeds search_chunks rows that are waiting (embedding is null): menu items
// and reviews, kept in sync by triggers in
// migrations/20261025120000_search_chunks.sql. pg_cron calls this every
// minute while anything is pending; it can also be run by hand with the
// service-role key for a quick backfill.
//
// Service-role only: chunk embeddings decide search ranking, so nobody else
// may trigger writes here. Enforced by the database, not a string compare:
// the caller's own token is used for every query, and only service_role has
// write access to search_chunks. (An exact match against
// SUPABASE_SERVICE_ROLE_KEY failed here -- the runtime's copy of the key isn't
// byte-identical to the dashboard's, though both are valid service_role JWTs.)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { embedText } from "../_shared/embeddings.ts";

// Small batches: 50 hit the free tier's compute limit (WORKER_RESOURCE_LIMIT)
// mid-run. The cron job comes back a minute later for the rest.
const BATCH_SIZE = 10;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  // Early exit so other callers don't burn embedding time; the real check is
  // the database rejecting their writes.
  if (jwtRole(authHeader) !== "service_role") {
    return json({ error: "Service role only" }, 403);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    },
  );

  const { data: pending, error: fetchError } = await admin
    .from("search_chunks")
    .select("id, content")
    .is("embedding", null)
    .limit(BATCH_SIZE);

  if (fetchError) {
    return json({ error: fetchError.message }, 500);
  }

  let embedded = 0;
  for (const chunk of pending ?? []) {
    const embedding = await embedText(chunk.content);
    // Matching on content too: if the text changed while we were embedding,
    // the trigger already nulled it again and the next run picks up the new
    // text, so don't overwrite it with a vector for the old one.
    const { error: updateError } = await admin
      .from("search_chunks")
      .update({ embedding })
      .eq("id", chunk.id)
      .eq("content", chunk.content);

    if (updateError) {
      return json({ error: updateError.message, embedded }, 500);
    }
    embedded++;
  }

  return json({ embedded });
});

function jwtRole(authHeader: string): string | null {
  try {
    const payload = authHeader.replace(/^Bearer /, "").split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded).role ?? null;
  } catch {
    return null;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
