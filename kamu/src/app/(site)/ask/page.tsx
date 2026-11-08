import Link from "next/link";
import { Suspense } from "react";
import { AskKamuForm } from "@/components/site/AskKamuForm";
import { RestaurantCard } from "@/components/site/RestaurantCard";
import { askKamu } from "@/lib/data/ask-kamu";
import { searchByMood, type MoodSearchResult } from "@/lib/data/mood-search";

// From a simple mood to a plan that needs several look-ups.
const EXAMPLES = [
  "Quiet place to read",
  "Spicy street food",
  "Cheap kottu that's open late tonight",
  "Lunch in Kandy with my vegetarian dad, then somewhere for dessert",
  "Seafood by the beach for a birthday dinner",
];

/**
 * The site's one search. Two layers on every question:
 * 1. Instant: meaning search (embeddings, no AI writing) finds matching
 *    places in a second or two.
 * 2. Streamed in: the Ask Kamu agent, which starts from the same search and
 *    can also filter, read menus and reviews, and check hours, writes the
 *    answer and picks places.
 */
export default async function AskKamuPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const question = q?.trim().slice(0, 500) ?? "";

  // The instant layer is optional: if it fails, the agent still answers.
  const matches = question ? await searchByMood(question).catch(() => []) : [];

  return (
    <main className="px-6 pb-16 pt-12 text-slate-900">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cinnamon-600">
              Ask Kamu
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold sm:text-5xl">
              What are you in the mood for?
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              A vibe, a craving or a whole plan. Kamu searches, reads menus
              and reviews, and checks opening hours for you.
            </p>
          </div>
          <AskKamuForm defaultValue={question} />
        </div>

        {question ? (
          // key: a new question remounts, so the fallback shows again.
          <Suspense
            key={question}
            fallback={
              <>
                <Thinking />
                <Matches matches={matches} title="Places that match the feel" />
              </>
            }
          >
            <Answer question={question} matches={matches} />
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

async function Answer({
  question,
  matches,
}: {
  question: string;
  matches: MoodSearchResult[];
}) {
  const { answer, steps, restaurants, error } = await askKamu(question);
  const picked = new Set(restaurants.map((r) => r.id));

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-4">
        {answer ? (
          <AnswerCard>
            {/* Plain text (React escapes it), never HTML. */}
            <p className="mt-3 whitespace-pre-line font-serif text-lg leading-8 text-slate-700">
              {answer}
            </p>
          </AnswerCard>
        ) : (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            {error}
            {matches.length > 0 ? " Meanwhile, here are places that match the feel." : ""}
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
      </div>

      {restaurants.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Kamu&apos;s picks</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        </section>
      ) : null}

      <Matches
        matches={matches.filter((m) => !picked.has(m.id))}
        title={restaurants.length > 0 ? "More places with a similar feel" : "Places that match the feel"}
      />
    </>
  );
}

/** The instant meaning-search results, with the menu/review line that matched. */
function Matches({ matches, title }: { matches: MoodSearchResult[]; title: string }) {
  if (matches.length === 0) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {matches.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant}>
            {restaurant.matched_on_evidence && restaurant.evidence?.[0] ? (
              <p className="mt-4 rounded-2xl bg-slate-100/80 px-3 py-2 text-xs leading-5 text-slate-600">
                <span className="font-semibold text-slate-700">Why it matched:</span>{" "}
                {restaurant.evidence[0]}
              </p>
            ) : null}
          </RestaurantCard>
        ))}
      </div>
    </section>
  );
}

function AnswerCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#cfe2c9] bg-linear-to-br from-[#eef6ea] to-white/80 p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
        Kamu&apos;s answer
      </p>
      {children}
    </div>
  );
}

function Thinking() {
  return (
    <div role="status" className="mx-auto max-w-3xl">
      <AnswerCard>
        <p className="mt-3 flex items-center gap-3 font-serif text-lg text-slate-700">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
          Kamu is thinking…
        </p>
        <p className="mt-2 text-sm text-slate-500">
          Reading menus and reviews and checking hours. Usually 10-30 seconds.
        </p>
      </AnswerCard>
    </div>
  );
}
