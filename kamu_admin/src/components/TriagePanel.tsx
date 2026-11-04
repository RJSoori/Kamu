"use client";

import { useActionState } from "react";
import { triageReportAction, type TriageState } from "@/app/(protected)/reports/actions";

/** Shape saved by triageReportAction; see kamu/supabase/functions/triage-report. */
export interface TriageSuggestion {
  action: string;
  confidence: string;
  summary: string;
  reasons: string[];
  note_for_owner: string | null;
  steps: string[];
}

// Each action names the existing control the admin would use.
const ACTION_LABELS: Record<string, string> = {
  dismiss: "Dismiss the report",
  hide_menu_item: "Hide the menu item",
  hide_restaurant: "Hide the restaurant",
  suspend_owner: "Suspend the owner",
  needs_human: "Needs your judgement",
};

const initialState: TriageState = { error: null };

/**
 * The AI triage agent's suggestion for one report, plus a button to run it
 * (again). Advice only: acting on it is still the Hide / Suspend / Resolve /
 * Dismiss controls on the report.
 */
export function TriagePanel({
  reportId,
  suggestion,
  createdAt,
}: {
  reportId: string;
  suggestion: TriageSuggestion | null;
  createdAt: string | null;
}) {
  const [state, formAction, isPending] = useActionState(
    triageReportAction.bind(null, reportId),
    initialState,
  );

  return (
    <div className="space-y-2 rounded-2xl bg-indigo-50 p-4 text-sm text-slate-800">
      {suggestion ? (
        <>
          <p className="text-xs text-indigo-700">
            AI suggestion · {suggestion.confidence} confidence
            {createdAt ? ` · ${new Date(createdAt).toLocaleString()}` : ""} · check before acting
          </p>
          <p className="font-semibold text-slate-900">
            {ACTION_LABELS[suggestion.action] ?? suggestion.action}
          </p>
          {suggestion.summary ? <p>{suggestion.summary}</p> : null}
          {suggestion.reasons.length > 0 ? (
            <ul className="list-disc pl-5 text-slate-700">
              {suggestion.reasons.map((reason, i) => (
                <li key={i}>{reason}</li>
              ))}
            </ul>
          ) : null}
          {suggestion.note_for_owner ? (
            <p className="text-slate-700">
              <span className="font-medium">Suggested note for the owner:</span>{" "}
              {suggestion.note_for_owner}
            </p>
          ) : null}
          {suggestion.steps.length > 0 ? (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer">How it worked this out</summary>
              <ol className="mt-1 list-decimal pl-5">
                {suggestion.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </details>
          ) : null}
        </>
      ) : (
        <p className="text-slate-600">
          Let the AI check this report&apos;s history, the reporter, the owner, the menu and
          reviews, and suggest what to do.
        </p>
      )}

      <form action={formAction} className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {isPending ? "Investigating (up to a minute)…" : suggestion ? "Run again" : "Investigate with AI"}
        </button>
        {state.error ? (
          <p role="alert" className="text-rose-700">
            {state.error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
