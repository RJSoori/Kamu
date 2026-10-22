import Link from "next/link";
import { HiddenBadge, HideControl } from "@/components/HideControl";
import { getRestaurants } from "@/lib/data/restaurants";
import { createClient } from "@/lib/supabase/server";
import {
  deleteRestaurantAction,
  setRestaurantHiddenAction,
  setRestaurantPublishedAction,
} from "./actions";

export default async function AdminRestaurantsPage() {
  const supabase = await createClient();
  const [restaurants, { data: owners, error }] = await Promise.all([
    getRestaurants(),
    supabase.from("restaurant_owners").select("id, email"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const ownerEmail = new Map((owners ?? []).map((o) => [o.id, o.email]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Restaurants</h1>
        <Link
          href="/restaurants/new"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add restaurant
        </Link>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Area</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant) => (
              <tr
                key={restaurant.id}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-slate-900">
                  {restaurant.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{restaurant.area}</td>
                <td className="px-4 py-3 text-slate-600">
                  {restaurant.owner_id
                    ? (ownerEmail.get(restaurant.owner_id) ?? "Unknown owner")
                    : "Admin-managed"}
                </td>
                <td className="flex flex-wrap gap-1.5 px-4 py-3">
                  <span
                    className={
                      restaurant.is_published
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                    }
                  >
                    {restaurant.is_published ? "Published" : "Draft"}
                  </span>
                  {restaurant.hidden_by_admin ? <HiddenBadge /> : null}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-4 text-sm">
                    <Link
                      href={`/restaurants/${restaurant.id}/edit`}
                      className="font-medium text-slate-700 hover:text-slate-900"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/restaurants/${restaurant.id}/menu-items`}
                      className="font-medium text-slate-700 hover:text-slate-900"
                    >
                      Menu
                    </Link>
                    <form
                      action={setRestaurantPublishedAction.bind(
                        null,
                        restaurant.id,
                        !restaurant.is_published,
                      )}
                    >
                      <button
                        type="submit"
                        className="font-medium text-slate-700 hover:text-slate-900"
                      >
                        {restaurant.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                    <HideControl
                      hidden={restaurant.hidden_by_admin}
                      hideAction={setRestaurantHiddenAction.bind(null, restaurant.id, true)}
                      unhideAction={setRestaurantHiddenAction.bind(null, restaurant.id, false)}
                    />
                    {/* Two clicks on purpose: deleting cascades to the menu, reviews and saves. */}
                    <details className="relative">
                      <summary className="cursor-pointer font-medium text-rose-600 hover:text-rose-700">
                        Delete
                      </summary>
                      <form
                        action={deleteRestaurantAction.bind(null, restaurant.id)}
                        className="absolute right-0 z-10 mt-2 w-72 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-lg"
                      >
                        <p className="text-sm text-slate-700">
                          Delete {restaurant.name} for good? Its menu, reviews and
                          saves go too. To take it offline instead, use Hide or
                          Unpublish.
                        </p>
                        <button
                          type="submit"
                          className="rounded-full bg-rose-600 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-rose-700"
                        >
                          Delete forever
                        </button>
                      </form>
                    </details>
                  </div>
                </td>
              </tr>
            ))}
            {restaurants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No restaurants yet. Add the first one to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
