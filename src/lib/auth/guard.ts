import "server-only";
import { createClient } from "@/lib/supabase/server";
import { canOwnerEdit, type OwnerStatus } from "@/lib/owner-status";

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export interface OwnerAccount {
  id: string;
  email: string | null;
  display_name: string | null;
  phone: string | null;
  status: OwnerStatus;
  status_note: string | null;
}

const OWNER_COLUMNS = "id, email, display_name, phone, status, status_note";

/**
 * Throws UnauthorizedError unless the current session belongs to a
 * registered restaurant owner, and returns that owner's account (including
 * its verification status). Call this from every protected server boundary.
 * Defense in depth, not the primary enforcement boundary: the RLS policies
 * in ../kamu/supabase/migrations (owner_id = auth.uid() and
 * is_active_owner()) are what actually stop a non-owner write even if this
 * guard were skipped.
 *
 * Unlike kamu's requireAdmin() (which needs a SECURITY DEFINER is_admin()
 * RPC because admin_users has zero SELECT policies), restaurant_owners has
 * a normal "select own row" policy, so a direct query works here.
 *
 * A valid Supabase session is NOT sufficient on its own: this app's
 * auth.users pool is shared with the customer-facing `kamu` app (same
 * Supabase project), so a plain customer account -- or an admin account --
 * can authenticate here too. Only a matching restaurant_owners row (created
 * by register, /auth/confirm, or the explicit upgrade on /login, see
 * src/lib/auth/owner.ts) counts as "is an owner".
 */
export async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Not signed in");
  }

  const { data: owner, error } = await supabase
    .from("restaurant_owners")
    .select(OWNER_COLUMNS)
    .eq("id", user.id)
    .maybeSingle();

  if (error || !owner) {
    throw new UnauthorizedError("Not a registered restaurant owner");
  }

  return { supabase, user, owner: owner as OwnerAccount };
}

/**
 * requireOwner() plus "this owner may currently make changes" (pending or
 * approved -- rejected/suspended owners are read-only). Use in every server
 * action that writes.
 */
export async function requireActiveOwner() {
  const context = await requireOwner();

  if (!canOwnerEdit(context.owner.status)) {
    throw new UnauthorizedError(
      "Your owner account can't make changes right now.",
    );
  }

  return context;
}
