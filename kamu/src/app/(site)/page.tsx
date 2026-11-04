import Link from "next/link";
import {
  getRestaurantFilterOptions,
  getRestaurants,
  type Restaurant,
} from "@/lib/data/restaurants";
import { RestaurantFilters } from "@/components/site/RestaurantFilters";
import { RestaurantCard } from "@/components/site/RestaurantCard";
import { MoodSearchForm } from "@/components/site/MoodSearchForm";

// One-tap starting points for people who don't know what they want yet.
const MOOD_IDEAS = [
  "Sunset by the beach",
  "Cosy rainy-day café",
  "Spicy street food",
  "Romantic dinner",
  "Hearty rice and curry",
  "Quiet place to read",
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; cuisine?: string; focus?: string }>;
}) {
  const { area, cuisine, focus } = await searchParams;

  let restaurants: Restaurant[] = [];
  let filterOptions = { areas: [] as string[], cuisines: [] as string[] };
  let errorMessage: string | null = null;

  try {
    [restaurants, filterOptions] = await Promise.all([
      getRestaurants({ area, cuisine }),
      getRestaurantFilterOptions(),
    ]);
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unable to fetch restaurants.";
  }

  return (
    <main className="px-6 pb-16 text-slate-900">
      <section className="mx-auto max-w-3xl pb-14 pt-16 text-center sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cinnamon-600">
          Eat by feeling
        </p>
        <h1 className="mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-6xl">
          What are you in the mood for today?
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-slate-600">
          Tell us how you feel, a craving or a vibe, and we&apos;ll find a
          place across Sri Lanka that fits it.
        </p>

        {/* HeaderSearch's phone icon links here with ?focus=search. */}
        <div id="mood-search" className="mx-auto mt-8 max-w-xl scroll-mt-24">
          <MoodSearchForm autoFocus={focus === "search"} />
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {MOOD_IDEAS.map((idea) => (
            <Link
              key={idea}
              href={`/search?q=${encodeURIComponent(idea)}`}
              className="rounded-full border border-slate-200 bg-white/70 px-4 py-1.5 text-sm text-slate-700 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
            >
              {idea}
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-slate-600">
          Planning something bigger, like lunch then dessert, or somewhere
          open late?{" "}
          <Link
            href="/ask"
            className="font-semibold text-cinnamon-600 underline-offset-4 hover:underline"
          >
            Ask Kamu →
          </Link>
        </p>
      </section>

      <section className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">Explore places</h2>
            <p className="mt-1 text-sm text-slate-600">
              Or browse by area and cuisine.
            </p>
          </div>
        </div>

        <RestaurantFilters
          areas={filterOptions.areas}
          cuisines={filterOptions.cuisines}
          selectedArea={area}
          selectedCuisine={cuisine}
        />

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h3 className="text-lg font-semibold">
              We couldn&apos;t load restaurants
            </h3>
            <p className="mt-2 text-sm leading-6">{errorMessage}</p>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-600">
            {area || cuisine
              ? "No places match these filters yet. Try another area or cuisine."
              : "No restaurants yet. Check back soon."}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((restaurant) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
