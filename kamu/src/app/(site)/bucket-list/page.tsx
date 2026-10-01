import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBucketList } from "@/lib/data/bucket-list";

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
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your bucket list
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Restaurants you&apos;ve saved.
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
            Nothing saved yet.{" "}
            <Link href="/" className="font-semibold text-slate-900 hover:underline">
              Browse restaurants
            </Link>{" "}
            and tap Save on one you like.
          </div>
        ) : (
          <div className="grid gap-4">
            {entries.map(({ restaurant, saved_at }) => (
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
                    <p className="mt-1 text-xs text-slate-400">
                      Saved {new Date(saved_at).toLocaleDateString()}
                    </p>
                  </div>
                  {restaurant.cover_photo_url ? (
                    <Image
                      src={restaurant.cover_photo_url}
                      alt={`${restaurant.name} cover`}
                      width={80}
                      height={80}
                      className="h-20 w-20 rounded-2xl object-cover"
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
