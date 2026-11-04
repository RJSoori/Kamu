import Link from "next/link";
import { Suspense } from "react";
import { RestaurantCard } from "@/components/site/RestaurantCard";
import { askKamu } from "@/lib/data/ask-kamu";

// Questions that need several look-ups, which is what the agent is for.
const EXAMPLES = [
  "Lunch in Kandy with my vegetarian dad, then somewhere for dessert",
  "Cheap spicy kottu that's open late tonight",
  "A quiet café in Colombo where I can work for a few hours",
  "Best seafood by the beach for a birthday dinner",
];

export default async function AskKamuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const question = q?.trim() ?? "";

  return (
    <main className="px-6 pb-16 pt-12 text-slate-900">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cinnamon-600">
            Ask Kamu
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
            Tell us your plan. We&apos;ll work it out.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Ask like you&apos;d ask a friend who knows every place. Kamu
            searches, reads menus and reviews, and checks opening hours for
            you.
          </p>
        </div>

        <form className="rounded-[2rem] border border-slate-200 bg-white/90 p-3 shadow-lg shadow-slate-900/5 transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200/70">
          <textarea
            name="q"
            // Same cap as the ask-kamu Edge Function.
            maxLength={500}
            rows={3}
            defaultValue={question}
            placeholder="e.g. Dinner in Galle Fort for two, nothing too expensive, and somewhere for ice cream after"
            aria-label="Your question for Kamu"
            required
            className="w-full resize-none bg-transparent px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3 px-2">
            <p className="text-xs text-slate-400">
              Takes up to a minute: Kamu does several look-ups.
            </p>
            <button
              type="submit"
              className="shrink-0 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ask
            </button>
          </div>
        </form>

        {question ? (
          // key: a new question remounts, so the fallback shows again.
          <Suspense key={question} fallback={<Thinking />}>
            <Answer question={question} />
          </Suspense>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-slate-500">Try one of these:</p>
            {EXAMPLES.map((example) => (
              <Link
                key={example}
                href={`/ask?q=${encodeURIComponent(example)}`}
                className="rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-center text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
              >
                {example}
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

async function Answer({ question }: { question: string }) {
  const { answer, steps, restaurants, error } = await askKamu(question);

  return (
    <div className="space-y-6">
      {answer ? (
        <div className="rounded-3xl border border-[#cfe2c9] bg-linear-to-br from-[#eef6ea] to-white/80 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
            Kamu&apos;s AI answer
          </p>
          {/* Plain text (React escapes it), never HTML. */}
          <p className="mt-3 whitespace-pre-line font-serif text-lg leading-8 text-slate-700">
            {answer}
          </p>
        </div>
      ) : (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          {error}
        </div>
      )}

      {steps.length > 0 ? (
        <details className="rounded-3xl border border-slate-200 bg-white/70 p-5">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">
            How Kamu worked this out ({steps.length} step
            {steps.length === 1 ? "" : "s"})
          </summary>
          <ol className="mt-3 list-decimal space-y-1 pl-6 text-sm text-slate-600">
            {steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </details>
      ) : null}

      {restaurants.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Thinking() {
  return (
    <div
      role="status"
      className="rounded-3xl border border-[#cfe2c9] bg-linear-to-br from-[#eef6ea] to-white/80 p-6 shadow-sm"
    >
      <p className="flex items-center gap-3 font-serif text-lg text-slate-700">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        Kamu is thinking…
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Searching places, reading menus and reviews, checking hours. This can
        take up to a minute.
      </p>
    </div>
  );
}
