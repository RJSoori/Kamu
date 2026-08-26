import Link from "next/link";
import { getRestaurants } from "@/lib/data/restaurants";
import {
  deleteRestaurantAction,
  setRestaurantPublishedAction,
} from "./actions";

export default async function AdminRestaurantsPage() {
  const restaurants = await getRestaurants();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Restaurants</h1>
        <Link
          href="/admin/restaurants/new"
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
                <td className="px-4 py-3">
                  <span
                    className={
                      restaurant.is_published
                        ? "rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800"
                        : "rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800"
                    }
                  >
                    {restaurant.is_published ? "Published" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-4 text-sm">
                    <Link
                      href={`/admin/restaurants/${restaurant.id}/edit`}
                      className="font-medium text-slate-700 hover:text-slate-900"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/admin/restaurants/${restaurant.id}/menu-items`}
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
                    <form action={deleteRestaurantAction.bind(null, restaurant.id)}>
                      <button
                        type="submit"
                        className="font-medium text-rose-600 hover:text-rose-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {restaurants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
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
