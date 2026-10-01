"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Floating trigger that sits on top of the filters island (positioned by
 * the parent -- see the home page) and opens the mood search input as a
 * modal instead of linking straight to /search. The form inside is a plain
 * GET form, same as the one on /search itself: submitting it navigates the
 * browser to /search?q=..., which does the actual (server-only) mood
 * search. No client-side fetch or duplicated result-rendering needed.
 */
export function MoodSearchButton() {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        Mood search
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 px-4 pt-24 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="mood-search-heading"
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="mood-search-heading"
                  className="text-xl font-semibold text-slate-900"
                >
                  What are you in the mood for?
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Describe a vibe or craving and we&apos;ll match it against
                  restaurant vibe descriptions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form
              action="/search"
              className="mt-5 flex flex-col gap-3 sm:flex-row"
            >
              <input
                ref={inputRef}
                type="text"
                name="q"
                placeholder="e.g. quiet place to read"
                required
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-900"
              />
              <button
                type="submit"
                className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
