import "server-only";
import { createClient } from "@/lib/supabase/server";

export class UnauthorizedError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Throws UnauthorizedError unless the current session belongs to an admin.
 *
 * This is defense-in-depth, not the primary enforcement boundary -- the
 * is_admin()-gated RLS policies (supabase/migrations) are what actually
 * stop a non-admin write even if this guard were ever skipped. Call it at
 * the top of every admin Server Action and from the protected admin
 * layout.
 *
 * Uses an RPC call to the is_admin() Postgres function rather than
 * querying admin_users directly: admin_users has zero SELECT policies for
 * the authenticated role by design (Section 4 of the foundations plan), so
 * a direct table query would always come back empty even for real admins.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new UnauthorizedError("Not signed in");
  }

  const { data: isAdmin, error } = await supabase.rpc("is_admin");

  if (error || !isAdmin) {
    throw new UnauthorizedError();
  }

  return { supabase, user };
}
