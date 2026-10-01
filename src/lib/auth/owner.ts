import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Ensures a `restaurant_owners` row exists for the given authenticated
 * user. Called only from the register action (src/app/(marketing)/register/
 * actions.ts) -- unlike kamu's ensureCustomerRow (called on every sign-in
 * path), login deliberately does NOT call this. See guard.ts's doc comment
 * for why: auth.users is shared with the customer-facing app, so a valid
 * session alone doesn't mean "this person registered as an owner", and
 * login should reject accounts that never did rather than silently
 * enrolling them.
 *
 * Upsert with ignoreDuplicates, same reasoning as ensureCustomerRow: turns
 * into `insert ... on conflict (id) do nothing`, so it only ever exercises
 * the restaurant_owners_insert_self RLS policy, safe to call again for an
 * already-registered owner.
 */
export async function ensureOwnerRow(
  supabase: SupabaseClient,
  user: User,
): Promise<void> {
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const { error } = await supabase.from("restaurant_owners").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("ensureOwnerRow failed:", error.message);
  }
}
