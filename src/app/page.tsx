import Image from "next/image";
import { getRestaurants, type Restaurant } from "@/lib/data/restaurants";

export default async function Home() {
  let restaurants: Restaurant[] = [];
  let errorMessage: string | null = null;

  try {
    restaurants = await getRestaurants();
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unable to fetch restaurants.";
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
              Phase 1 · Browse restaurants
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Find restaurants by vibe, area, or cuisine.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                This page loads restaurant records from Supabase and shows the
                first live listing view.
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold">Restaurant directory</h2>
              <p className="mt-2 text-sm text-slate-600">
                Powered by your Supabase `restaurants` table.
              </p>
            </div>

            {errorMessage ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
                <h3 className="text-lg font-semibold">
                  Unable to load restaurants
                </h3>
                <p className="mt-2 text-sm leading-6">{errorMessage}</p>
              </div>
            ) : restaurants.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
                <p className="text-base">
                  No restaurants found yet. Add rows to the `restaurants` table
                  in Supabase.
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {restaurants.map((restaurant) => (
                  <article
                    key={restaurant.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                          {restaurant.area || "Unknown area"}
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold text-slate-900">
                          {restaurant.name}
                        </h3>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                        {restaurant.price_range || "-"}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="max-w-2xl text-sm leading-6 text-slate-600">
                        {restaurant.vibe_description ||
                          "No vibe description available."}
                      </p>
                      {restaurant.cover_photo_url ? (
                        <Image
                          src={restaurant.cover_photo_url}
                          alt={`${restaurant.name} cover`}
                          width={96}
                          height={96}
                          className="h-24 w-24 rounded-3xl object-cover"
                        />
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold">Next steps</h2>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li>
                  Build a mood search input and query matching restaurants
                </li>
                <li>Add restaurant detail pages</li>
                <li>Enable Supabase Auth and bucket lists</li>
              </ul>
            </div>
            <div className="mt-6 rounded-3xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
              This page uses a server-side Supabase query, so the data is
              fetched securely and statically for the first render.
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
