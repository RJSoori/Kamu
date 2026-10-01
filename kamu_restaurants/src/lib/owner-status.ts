/**
 * Owner verification + listing visibility rules, as plain functions so the
 * dashboard can explain them and tests can pin them down. The database is
 * the actual enforcement (RLS + guard triggers in
 * ../kamu/supabase/migrations/20261001120000_owner_verification_and_reports.sql);
 * these must stay in step with it.
 */

export type OwnerStatus = "pending" | "approved" | "rejected" | "suspended";

/** Pending owners can build drafts; rejected/suspended owners are read-only. */
export function canOwnerEdit(status: OwnerStatus): boolean {
  return status === "pending" || status === "approved";
}

export type ListingState =
  | "draft"
  | "awaiting_verification"
  | "live"
  | "hidden_by_admin"
  | "offline";

/**
 * What customers currently see of one restaurant or menu item, given the
 * owner's account status. Mirrors is_restaurant_public() in the migration.
 */
export function listingState(
  item: { is_published?: boolean; hidden_by_admin: boolean },
  ownerStatus: OwnerStatus,
): ListingState {
  if (item.hidden_by_admin) {
    return "hidden_by_admin";
  }
  if (item.is_published === false) {
    return "draft";
  }
  switch (ownerStatus) {
    case "approved":
      return "live";
    case "pending":
      return "awaiting_verification";
    default:
      return "offline";
  }
}
