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

export interface TriageState {
  error: string | null;
}

/**
 * Runs the triage agent (kamu/supabase/functions/triage-report) on one
 * report and saves its suggestion for every admin to see. Advice only:
 * nothing is hidden, suspended or closed here. Slow (30-90s on the free
 * Gemini tier), hence maxDuration on the reports page.
 */
export async function triageReportAction(reportId: string): Promise<TriageState> {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase.functions.invoke<{
    suggestion: Record<string, unknown>;
  }>("triage-report", { body: { report_id: reportId } });

  if (error || !data?.suggestion) {
    // Non-2xx: the function's JSON body has a readable message.
    const body = await error?.context?.json?.().catch(() => null);
    return { error: body?.error ?? "The triage agent couldn't run. Try again." };
  }

  const { error: saveError } = await supabase.from("report_triage").upsert({
    report_id: reportId,
    suggestion: data.suggestion,
    created_at: new Date().toISOString(),
  });
  if (saveError) {
    return { error: saveError.message };
  }

  revalidatePath("/reports");
  return { error: null };
}
