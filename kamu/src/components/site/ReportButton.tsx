"use client";

import { useActionState } from "react";
import { submitReport, type ReportFormState } from "@/app/(site)/restaurants/[id]/actions";
import { REPORT_REASONS } from "@/lib/report-reasons";

const initialState: ReportFormState = { error: null, sent: false };

/** Only render for signed-in customers: the insert needs auth.uid(). */
export function ReportButton({
  restaurantId,
  menuItemId = null,
}: {
  restaurantId: string;
  menuItemId?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    submitReport.bind(null, restaurantId, menuItemId),
    initialState,
  );

  if (state.sent) {
    return <p className="text-xs text-slate-500">Thanks, we&apos;ll take a look.</p>;
  }

  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-slate-400 hover:text-slate-600">
        Report
      </summary>
      <form
        action={formAction}
        className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3"
      >
        <select
          name="reason"
          required
          defaultValue=""
          className="w-full rounded-xl border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
        >
          <option value="" disabled>
            What&apos;s wrong?
          </option>
          {REPORT_REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <textarea
          name="details"
          rows={2}
          maxLength={2000}
          placeholder="Details (optional)"
          className="w-full rounded-xl border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
        />
        {state.error ? <p className="text-rose-600">{state.error}</p> : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Sending…" : "Send report"}
        </button>
      </form>
    </details>
  );
}
