import Image from "next/image";
import Link from "next/link";
import { searchByMood, type MoodSearchResult } from "@/lib/data/mood-search";

export default async function MoodSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let results: MoodSearchResult[] = [];
  let errorMessage: string | null = null;

  if (query) {
    try {
      results = await searchByMood(query);
    } catch (error) {
      errorMessage =
        error instanceof Error ? error.message : "Search failed.";
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            What are you in the mood for?
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Describe a vibe or craving — &ldquo;quiet place to read&rdquo;,
            &ldquo;spicy street food&rdquo;, &ldquo;romantic date&rdquo; —
            and we&apos;ll match it against restaurant vibe descriptions.
          </p>
        </div>

        {/* Plain GET form, no client JS -- submitting re-requests this page
            with ?q=, which is read server-side above. Same pattern as
            RestaurantFilters on the home page. */}
        <form className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="e.g. cheap fast food"
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

        {errorMessage ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
            <h2 className="text-lg font-semibold">Search failed</h2>
            <p className="mt-2 text-sm leading-6">{errorMessage}</p>
          </div>
        ) : query && results.length === 0 ? (
          <p className="text-sm text-slate-600">
            No matches for &ldquo;{query}&rdquo;. Try describing it
            differently.
          </p>
        ) : (
          <div className="grid gap-4">
            {results.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className="block rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                      {restaurant.area || "Unknown area"}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">
                      {restaurant.name}
                    </h2>
                    {restaurant.vibe_description ? (
                      <p className="mt-2 max-w-xl text-sm text-slate-600">
                        {restaurant.vibe_description}
                      </p>
                    ) : null}
                  </div>
                  {restaurant.cover_photo_url ? (
                    <Image
                      src={restaurant.cover_photo_url}
                      alt={`${restaurant.name} cover`}
                      width={80}
                      height={80}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                    />
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
