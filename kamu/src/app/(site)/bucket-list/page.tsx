import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBucketList } from "@/lib/data/bucket-list";
import { RestaurantCard } from "@/components/site/RestaurantCard";

export default async function BucketListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/bucket-list");
  }

  const entries = await getBucketList();

  return (
    <main className="px-6 pb-16 pt-12 text-slate-900">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <div>
          <h1 className="text-4xl font-semibold sm:text-5xl">
            Your bucket list
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Places you&apos;ve saved to try, or to go back to.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-600">
            Nothing saved yet.{" "}
            <Link href="/" className="font-semibold text-slate-900 hover:underline">
              Browse restaurants
            </Link>{" "}
            and tap Save on one you like.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map(({ restaurant, saved_at }) => (
              <RestaurantCard key={restaurant.id} restaurant={restaurant}>
                <p className="mt-3 text-xs text-slate-400">
                  Saved {new Date(saved_at).toLocaleDateString()}
                </p>
              </RestaurantCard>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
