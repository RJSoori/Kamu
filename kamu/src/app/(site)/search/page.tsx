import { Suspense } from "react";
import { SelectField } from "@/components/site/RestaurantFilters";
import { MoodSearchForm } from "@/components/site/MoodSearchForm";
import { RestaurantCard } from "@/components/site/RestaurantCard";
import { searchByMood, type MoodSearchResult } from "@/lib/data/mood-search";
import { getRestaurantFilterOptions } from "@/lib/data/restaurants";

// Same values the owner portal allows.
const PRICE_RANGES = ["$", "$$", "$$$"];

export default async function MoodSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; area?: string; price?: string }>;
}) {
  const { q, area, price } = await searchParams;
  const query = q?.trim() ?? "";
  const filters = { area: area || undefined, price: price || undefined };

  // Dropdown options only; search still works if this fails.
  const areas = await getRestaurantFilterOptions()
    .then((options) => options.areas)
    .catch(() => []);

  let results: MoodSearchResult[] = [];
  let errorMessage: string | null = null;

  if (query) {
    try {
      // List only: the AI summary streams in separately (AiSummary below),
      // because Gemini's free tier can take 20s+.
      ({ results } = await searchByMood(query, { ...filters, generate: false }));
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Search failed.";
    }
  }

  return (
    <main className="px-6 pb-16 pt-12 text-slate-900">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <div>
            <h1 className="text-balance text-4xl font-semibold sm:text-5xl">
              What are you in the mood for?
            </h1>
            <p className="mt-3 text-slate-600">
              Describe a vibe or a craving: &ldquo;quiet place to
              read&rdquo;, &ldquo;spicy street food&rdquo;, &ldquo;romantic
              date&rdquo;.
            </p>
          </div>

          <MoodSearchForm defaultValue={query}>
            <div className="mt-2 flex flex-wrap justify-center gap-3 border-t border-slate-100 px-3 pb-2 pt-3 text-left">
              <SelectField
                label="Area"
                name="area"
                defaultValue={filters.area ?? ""}
                options={areas}
              />
              <SelectField
                label="Price"
                name="price"
                defaultValue={filters.price ?? ""}
                options={PRICE_RANGES}
              />
            </div>
          </MoodSearchForm>
        </div>

        {errorMessage ? (
          <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Search failed</h2>
            <p className="mt-2 text-sm leading-6">{errorMessage}</p>
          </div>
        ) : query && results.length === 0 ? (
          <p className="mx-auto max-w-2xl rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-600">
            Nothing matched &ldquo;{query}&rdquo;
            {filters.area || filters.price ? " with these filters" : ""}. Try
            describing it differently.
          </p>
        ) : query ? (
          <div className="space-y-6">
            <Suspense
              fallback={
                <AiSummaryCard>
                  <span className="animate-pulse text-slate-500">
                    Reading the menus and reviews of these places for you…
                  </span>
                </AiSummaryCard>
              }
            >
              <AiSummary query={query} filters={filters} />
            </Suspense>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant}>
                  {restaurant.matched_on_evidence && restaurant.evidence?.[0] ? (
                    <p className="mt-4 rounded-2xl bg-slate-100/80 px-3 py-2 text-xs leading-5 text-slate-600">
                      <span className="font-semibold text-slate-700">
                        Why it matched:
                      </span>{" "}
                      {restaurant.evidence[0]}
                    </p>
                  ) : null}
                </RestaurantCard>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

// Runs the search again with generation on (cheap: one embedding + one query)
// rather than taking the results from the browser, so nobody can feed Gemini
// a made-up restaurant list. Renders nothing if there's no answer.
async function AiSummary({
  query,
  filters,
}: {
  query: string;
  filters: { area?: string; price?: string };
}) {
  let answer: string | null = null;
  try {
    ({ answer } = await searchByMood(query, filters));
  } catch {
    // The list below already rendered; the summary is optional.
  }
  if (!answer) return null;

  return (
    <AiSummaryCard>
      {/* Plain text (React escapes it), never HTML. */}
      <span className="whitespace-pre-line text-slate-700">{answer}</span>
    </AiSummaryCard>
  );
}

function AiSummaryCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-[#cfe2c9] bg-linear-to-br from-[#eef6ea] to-white/80 p-6 shadow-sm">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-800">
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 2l1.8 5.5L19 9.3l-5.2 1.8L12 16.5l-1.8-5.4L5 9.3l5.2-1.8L12 2zm7 12l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z"
          />
        </svg>
        Kamu&apos;s AI pick · based on the places below
      </p>
      <p aria-live="polite" className="mt-3 font-serif text-lg leading-8">
        {children}
      </p>
    </div>
  );
}
