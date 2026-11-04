// Shared by the owner-app AI functions (menu-import, listing-assist,
// listing-coach): who's calling, may they edit, and have they used up
// today's AI allowance.
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

export type AiFeature =
  | "menu_import"
  | "listing_check"
  | "listing_suggest"
  | "listing_coach";

// Per owner per 24h, to protect the free Gemini quota. The three listing
// features share one allowance.
const LISTING: AiFeature[] = ["listing_check", "listing_suggest", "listing_coach"];
const LIMITS = { menu_import: 10, listing: 20 };

export interface OwnerCaller {
  ownerId: string;
  /** Runs as the owner: RLS decides what they can read. */
  caller: SupabaseClient;
  /** Service role: only for owner_ai_usage and coach_sessions. */
  service: SupabaseClient;
}

/** The calling owner, or an error Response (401/403). */
export async function activeOwner(req: Request): Promise<OwnerCaller | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return error("Sign in first", 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  // getUser() checks the token with the auth server, so the id is real.
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return error("Sign in first", 401);

  const { data: active } = await caller.rpc("is_active_owner");
  if (!active) return error("Only active restaurant owners can use this", 403);

  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  return { ownerId: user.id, caller, service };
}

/** Counts one use; false when the owner has hit today's limit. */
export async function takeDailyQuota(
  { service, ownerId }: OwnerCaller,
  feature: AiFeature,
): Promise<boolean> {
  const group = LISTING.includes(feature) ? LISTING : [feature];
  const limit = LISTING.includes(feature) ? LIMITS.listing : LIMITS.menu_import;

  const { count, error: countError } = await service
    .from("owner_ai_usage")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .in("feature", group)
    .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
  if (countError) throw countError;
  if ((count ?? 0) >= limit) return false;

  const { error: insertError } = await service
    .from("owner_ai_usage")
    .insert({ owner_id: ownerId, feature });
  if (insertError) throw insertError;
  return true;
}

export const LIMIT_REACHED =
  "You've used today's AI help allowance. It resets within 24 hours; you can still edit by hand.";

function error(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
