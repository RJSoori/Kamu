import "server-only";
import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Throws UnauthorizedError unless the current session belongs to a
 * registered restaurant owner. Call this from every protected server
 * boundary (currently just src/app/dashboard/layout.tsx) -- defense in
 * depth, not the primary enforcement boundary; the owner_id = auth.uid()
 * RLS policies (../kamu/supabase/migrations/20260911120000_restaurant_owners.sql)
 * are what actually stop a non-owner write even if this guard were skipped.
 *
 * Unlike kamu's requireAdmin() (which needs a SECURITY DEFINER is_admin()
 * RPC because admin_users has zero SELECT policies), restaurant_owners has
 * a normal "select own row" policy, so a direct query works here.
 *
 * A valid Supabase session is NOT sufficient on its own: this app's
 * auth.users pool is shared with the customer-facing `kamu` app (same
 * Supabase project), so a plain customer account -- or an admin account --
 * can authenticate here too. Only a matching restaurant_owners row (created
 * by the register flow, see src/lib/auth/owner.ts) counts as "is an owner".
 */
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Not signed in");
  }

  const { data: ownerRow, error } = await supabase
    .from("restaurant_owners")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !ownerRow) {
    throw new UnauthorizedError("Not a registered restaurant owner");
  }

  return { supabase, user };
}
