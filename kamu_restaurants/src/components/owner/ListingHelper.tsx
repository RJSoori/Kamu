"use client";

import { useRef, useState, useTransition } from "react";
import {
  answerCoachAction,
  checkListingAction,
  startCoachAction,
  suggestListingAction,
} from "@/app/dashboard/restaurants/ai-actions";
import type { CoachTurn, ListingCheck, Proposal } from "@/lib/data/ai-help";

type View =
  | { kind: "idle" }
  | { kind: "checked"; check: ListingCheck }
  | { kind: "coach"; turn: CoachTurn }
  | { kind: "proposal"; proposal: Proposal; steps: CoachTurn["steps"] };

const SOURCE_LABELS: Record<string, string> = {
  listing: "your listing",
  menu: "your menu",
  reviews: "customer reviews",
  owner: "your answers",
};

/**
 * Help writing the vibe description, inside RestaurantForm. Two versions,
 * so they can be compared (docs/listing-coach.md):
 * - "Check my description": Version 1, fixed steps (check, ask, write).
 * - "Coach me": Version 2, the agent (looks first, asks only what's missing).
 * Both only suggest: "Use this" fills the box, and the owner still saves.
 */
export function ListingHelper({ restaurantId }: { restaurantId: string | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  /** The surrounding form's current values (it's uncontrolled). */
  function formValues() {
    const form = rootRef.current?.closest("form");
    const value = (name: string) => {
      const field = form?.elements.namedItem(name);
      return field && "value" in field ? String(field.value) : "";
    };
    return {
      restaurantId,
      form: {
        name: value("name"),
        area: value("area"),
        cuisine_type: value("cuisine_type"),
        price_range: value("price_range"),
      },
      description: value("vibe_description"),
    };
  }

  function run<T>(call: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, next: (data: T) => void) {
    setError(null);
    startTransition(async () => {
      const result = await call();
      if (result.ok) next(result.data);
      else setError(result.error);
    });
  }

  function showTurn(turn: CoachTurn) {
    setAnswers({});
    const { outcome } = turn;
    if (outcome.type === "proposal") setView({ kind: "proposal", proposal: outcome, steps: turn.steps });
    else if (outcome.type === "failed") setError(outcome.error);
    else setView({ kind: "coach", turn });
  }

  function applyProposal(text: string) {
    const field = rootRef.current?.closest("form")?.elements.namedItem("vibe_description");
    if (field instanceof HTMLTextAreaElement) {
      field.value = text;
      field.focus();
    }
    setView({ kind: "idle" });
  }

  const button =
    "rounded-full border border-indigo-300 bg-white px-4 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:opacity-60";

  return (
    <div ref={rootRef} className="space-y-3 rounded-2xl bg-indigo-50 p-4 text-sm text-slate-800">
      {view.kind === "idle" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-medium text-slate-900">Need help with this?</span>
          <button
            type="button"
            disabled={pending}
            className={button}
            onClick={() => run(() => checkListingAction(formValues().description), (check) => setView({ kind: "checked", check }))}
          >
            Check my description
          </button>
          <button
            type="button"
            disabled={pending}
            className={button}
            onClick={() => run(() => startCoachAction(formValues()), showTurn)}
          >
            Coach me
          </button>
        </div>
      ) : null}

      {view.kind === "checked" ? (
        <div className="space-y-3">
          <ul className="space-y-1">
            {!view.check.length_ok ? (
              <li>✗ At least {view.check.min_length} characters</li>
            ) : null}
            {view.check.criteria.map((c) => (
              <li key={c.id}>
                {c.met ? "✓" : "✗"} {c.label}
              </li>
            ))}
          </ul>
          {view.check.criteria.filter((c) => !c.met).map((c) => (
            <Choices
              key={c.id}
              question={c.question}
              options={c.options}
              value={answers[c.id] ?? ""}
              onChange={(value) => setAnswers((a) => ({ ...a, [c.id]: value }))}
            />
          ))}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending}
              className={button}
              onClick={() => run(() => suggestListingAction({ ...formValues(), answers }), ({ proposal }) => setView({ kind: "proposal", proposal, steps: [] }))}
            >
              Write a suggestion
            </button>
            <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => setView({ kind: "idle" })}>
              Close
            </button>
          </div>
        </div>
      ) : null}

      {view.kind === "coach" && view.turn.outcome.type === "question" ? (
        <div className="space-y-3">
          <Steps steps={view.turn.steps} />
          <Choices
            question={view.turn.outcome.question}
            options={view.turn.outcome.options}
            value={answers.coach ?? ""}
            onChange={(value) => setAnswers({ coach: value })}
          />
          <div className="flex gap-3">
            <button
              type="button"
              disabled={pending || !answers.coach?.trim()}
              className={button}
              onClick={() => run(() => answerCoachAction(view.turn.session_id, answers.coach), showTurn)}
            >
              Answer
            </button>
            <button
              type="button"
              disabled={pending}
              className="text-slate-500 hover:text-slate-900"
              onClick={() => run(() => answerCoachAction(view.turn.session_id, "I don't know"), showTurn)}
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}

      {view.kind === "proposal" ? (
        <div className="space-y-3">
          <Steps steps={view.steps} />
          <p className="rounded-xl bg-white p-3 text-slate-900">{view.proposal.description}</p>
          {/\[[^\]]+\]/.test(view.proposal.description) ? (
            <p className="text-amber-800">Fill in anything in [brackets] before saving.</p>
          ) : null}
          {view.proposal.sources.length > 0 ? (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer">Where each fact came from</summary>
              <ul className="mt-1 list-disc pl-5">
                {view.proposal.sources.map((s, i) => (
                  <li key={i}>
                    {s.claim}: {SOURCE_LABELS[s.from] ?? s.from}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <div className="flex gap-3">
            <button type="button" className={button} onClick={() => applyProposal(view.proposal.description)}>
              Use this
            </button>
            <button type="button" className="text-slate-500 hover:text-slate-900" onClick={() => setView({ kind: "idle" })}>
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {pending ? <p className="text-indigo-700">Thinking (can take up to a minute)…</p> : null}
      {error ? <p role="alert" className="text-rose-700">{error}</p> : null}
    </div>
  );
}

/** A question with tap options plus a free-text box. */
function Choices({
  question,
  options,
  value,
  onChange,
}: {
  question: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-medium text-slate-900">{question}</legend>
      {options.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={value === option}
              onClick={() => onChange(value === option ? "" : option)}
              className={`rounded-full border px-3 py-1 ${
                value === option ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
      <input
        value={options.includes(value) ? "" : value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={200}
        placeholder={options.length ? "Or type your own" : "Type your answer"}
        aria-label={question}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
    </fieldset>
  );
}

function Steps({ steps }: { steps: CoachTurn["steps"] }) {
  if (steps.length === 0) return null;
  return (
    <details className="text-xs text-slate-600">
      <summary className="cursor-pointer">What the coach did</summary>
      <ol className="mt-1 list-decimal pl-5">
        {steps.map((step, i) => (
          <li key={i}>{step.detail}</li>
        ))}
      </ol>
    </details>
  );
}
