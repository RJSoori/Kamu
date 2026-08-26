import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantById } from "@/lib/data/restaurants";
import { getMenuItemsByRestaurant, type MenuItem } from "@/lib/data/menu-items";

const DAY_LABELS: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const restaurant = await getRestaurantById(id);

  if (!restaurant) {
    notFound();
  }

  const menuItems = await getMenuItemsByRestaurant(id);
  const menuByCategory = groupByCategory(menuItems);
  const openingHours = Object.entries(restaurant.opening_hours ?? {});

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <Link
          href="/"
          className="text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          ← All restaurants
        </Link>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {restaurant.cover_photo_url ? (
            <Image
              src={restaurant.cover_photo_url}
              alt={`${restaurant.name} cover`}
              width={1024}
              height={320}
              className="h-64 w-full object-cover"
            />
          ) : null}

          <div className="space-y-6 p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                  {restaurant.area || "Unknown area"}
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {restaurant.name}
                </h1>
                {restaurant.address ? (
                  <p className="mt-2 text-sm text-slate-600">
                    {restaurant.address}
                  </p>
                ) : null}
              </div>
              <div className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {restaurant.price_range || "-"}
              </div>
            </div>

            {restaurant.cuisine_type && restaurant.cuisine_type.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {restaurant.cuisine_type.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            ) : null}

            {restaurant.vibe_description ? (
              <p className="text-base leading-7 text-slate-700">
                {restaurant.vibe_description}
              </p>
            ) : null}

            {restaurant.latitude && restaurant.longitude ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Map view coming once a Mapbox token is connected (Phase 2). Coordinates on file: {restaurant.latitude}, {restaurant.longitude}.
              </div>
            ) : null}

            {openingHours.length > 0 ? (
              <div>
                <h2 className="text-lg font-semibold">Hours</h2>
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
                  {openingHours.map(([day, hours]) => (
                    <div key={day} className="flex justify-between gap-2">
                      <dt className="font-medium text-slate-700">
                        {DAY_LABELS[day] ?? day}
                      </dt>
                      <dd>{String(hours)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-2xl font-semibold">Menu</h2>
          {menuByCategory.size === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No menu items added yet.
            </p>
          ) : (
            <div className="mt-6 space-y-8">
              {[...menuByCategory.entries()].map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {category}
                  </h3>
                  <div className="mt-3 divide-y divide-slate-100">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {item.item_name}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-600">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        {item.price !== null ? (
                          <p className="whitespace-nowrap font-semibold text-slate-900">
                            LKR {item.price.toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function groupByCategory(items: MenuItem[]): Map<string, MenuItem[]> {
  const grouped = new Map<string, MenuItem[]>();

  for (const item of items) {
    const category = item.category || "Uncategorized";
    const existing = grouped.get(category);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(category, [item]);
    }
  }

  return grouped;
}
