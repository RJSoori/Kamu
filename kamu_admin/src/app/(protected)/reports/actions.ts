"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";

// No way back to "open": closed reports are history.
const REPORT_STATUSES = ["reviewing", "resolved", "dismissed"];

/**
 * Only changes the report itself. Hiding the content or suspending the owner
 * is a separate action (HideControl / setOwnerStatusAction).
 */
export async function setReportStatusAction(
  reportId: string,
  status: string,
  formData: FormData,
) {
  const { supabase } = await requireAdmin();

  if (!REPORT_STATUSES.includes(status)) {
    throw new Error("Unknown status.");
  }

  const adminNotes = String(formData.get("admin_notes") ?? "").trim() || null;
  const { error } = await supabase
    .from("content_reports")
    .update({ status, admin_notes: adminNotes })
    .eq("id", reportId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/", "layout");
}
