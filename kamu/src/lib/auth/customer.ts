import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";

/**
 * Ensures a `customers` row exists for the given authenticated user.
 *
 * Every sign-in path (password login, signup, Google OAuth callback) calls
 * this -- it's the only thing that ever creates a customers row, so it has
 * to be idempotent and safe to call on every login, not just the first one.
 *
 * Uses upsert with ignoreDuplicates rather than a plain insert: Postgrest
 * turns that into `insert ... on conflict (id) do nothing`, which only ever
 * exercises the customers_insert_self RLS policy (id = auth.uid()) and never
 * touches the update policy, even on the 2nd..nth call for the same user.
 *
 * Must be called with a session-bound client (src/lib/supabase/server.ts),
 * never the service-role client -- the insert policy requires
 * auth.uid() = id, which only holds for the caller's own session.
 */
export async function ensureCustomerRow(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const { error } = await supabase.from("customers").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) {
    // Don't block the login flow over this -- the session is already valid
    // either way, and a missing customers row will surface (loudly) the
    // moment a bucket-list/review write hits its RLS policy.
    console.error("ensureCustomerRow failed:", error.message);
  }
}
