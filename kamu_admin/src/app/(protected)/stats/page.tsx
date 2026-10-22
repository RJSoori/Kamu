import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminStatsPage() {
  const supabase = await createClient();
  const count = { count: "exact", head: true } as const;

  const [pendingOwners, openReports, published, customers, saves] =
    await Promise.all([
      supabase.from("restaurant_owners").select("*", count).eq("status", "pending"),
      supabase.from("content_reports").select("*", count).in("status", ["open", "reviewing"]),
      supabase.from("restaurants").select("*", count).eq("is_published", true),
      supabase.from("customers").select("*", count),
      // shortcut: counts saves in JS, and Supabase returns at most 1,000 rows, so past 1,000 saves the ranking is wrong; move to a SQL view before then
      supabase.from("bucket_lists").select("restaurant_id, restaurants(name)"),
    ]);

  for (const result of [pendingOwners, openReports, published, customers, saves]) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  const saveCounts = new Map<string, { name: string; count: number }>();
  for (const row of (saves.data ?? []) as unknown as {
    restaurant_id: string;
    restaurants: { name: string } | null;
  }[]) {
    const entry = saveCounts.get(row.restaurant_id) ?? {
      name: row.restaurants?.name ?? "Unknown",
      count: 0,
    };
    entry.count += 1;
    saveCounts.set(row.restaurant_id, entry);
  }
  const mostSaved = [...saveCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);

  const tiles = [
    { label: "Owners awaiting approval", value: pendingOwners.count, href: "/owners" },
    { label: "Open reports", value: openReports.count, href: "/reports" },
    { label: "Published restaurants", value: published.count, href: "/restaurants" },
    { label: "Customers", value: customers.count, href: null },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Stats</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const body = (
            <>
              <p className="text-3xl font-semibold text-slate-900">{tile.value ?? 0}</p>
              <p className="mt-1 text-sm text-slate-500">{tile.label}</p>
            </>
          );
          return tile.href ? (
            <Link
              key={tile.label}
              href={tile.href}
              className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-slate-300"
            >
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="rounded-3xl border border-slate-200 bg-white p-6">
              {body}
            </div>
          );
        })}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Most saved restaurants</h2>
        {mostSaved.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No saves yet.</p>
        ) : (
          <ol className="mt-3 space-y-2 text-sm">
            {mostSaved.map(([id, e], i) => (
              <li key={id} className="flex justify-between">
                <span className="text-slate-900">
                  {i + 1}. {e.name}
                </span>
                <span className="text-slate-500">
                  {e.count} save{e.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
