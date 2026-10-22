"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { OWNER_STATUSES, type OwnerStatus } from "@/lib/admin/owner-status";

/**
 * Approve clears the note. Reject/suspend need one: it's shown on the
 * owner's dashboard as the reason. Never delete an owner instead -- that
 * orphans their listings, which makes published ones public again.
 */
export async function setOwnerStatusAction(
  ownerId: string,
  status: OwnerStatus,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();

  if (!OWNER_STATUSES.includes(status)) {
    throw new Error("Unknown status.");
  }

  const note = String(formData.get("status_note") ?? "").trim() || null;
  if ((status === "rejected" || status === "suspended") && !note) {
    throw new Error("Tell the owner why in the note.");
  }

  const { error } = await supabase
    .from("restaurant_owners")
    .update({ status, status_note: status === "approved" ? null : note })
    .eq("id", ownerId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
