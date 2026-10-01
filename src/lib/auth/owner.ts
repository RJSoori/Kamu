import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Stored in auth user_metadata at sign-up (src/app/(marketing)/register/
 * actions.ts) to record "this account was created to be a restaurant
 * owner". Needed because with email confirmation on, sign-up returns no
 * session, so the restaurant_owners row can't be created until the owner
 * confirms and comes back (src/app/auth/confirm/route.ts, or login).
 *
 * user_metadata is user-editable, but that grants nothing extra:
 * restaurant_owners_insert_self already lets any signed-in account
 * self-enroll, and the restaurant_owners_guard trigger forces every
 * self-enrollment to status 'pending' until an admin approves it.
 */
export const OWNER_ACCOUNT_TYPE = "owner";

export function hasOwnerIntent(user: User): boolean {
  return user.user_metadata?.account_type === OWNER_ACCOUNT_TYPE;
}

/**
 * Ensures a `restaurant_owners` row exists for the given authenticated
 * user. Never called implicitly on login for accounts without owner intent:
 * auth.users is shared with the customer-facing app, so a valid session
 * alone doesn't mean "this person wants to be an owner" (see guard.ts).
 * Callers are register, /auth/confirm, login (owner-intent accounts only),
 * and the explicit "register this account as an owner" upgrade.
 *
 * Upsert with ignoreDuplicates turns into `insert ... on conflict (id) do
 * nothing`, so it only ever exercises the restaurant_owners_insert_self RLS
 * policy, and is safe to call again for an already-registered owner. The
 * status always starts 'pending' (enforced by a DB trigger, not here).
 */
export async function ensureOwnerRow(
  supabase: SupabaseClient,
  user: User,
  details: { displayName?: string | null; phone?: string | null } = {},
): Promise<{ error: string | null }> {
  const displayName =
    details.displayName ||
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    null;
  const phone =
    details.phone || (user.user_metadata?.phone as string | undefined) || null;

  const { error } = await supabase.from("restaurant_owners").upsert(
    {
      id: user.id,
      email: user.email ?? null,
      display_name: displayName,
      phone,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  if (error) {
    console.error("ensureOwnerRow failed:", error.message);
    return {
      error:
        "We couldn't finish setting up your owner account. Please try again in a moment.",
    };
  }

  return { error: null };
}
