import Link from "next/link";
import { notFound } from "next/navigation";
import { getRestaurantById } from "@/lib/data/restaurants";
import { getMenuItemsByRestaurant } from "@/lib/data/menu-items";
import { createMenuItemAction, deleteMenuItemAction } from "./actions";

export default async function MenuItemsPage({
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

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/admin/restaurants/${id}/edit`}
          className="text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          ← Back to {restaurant.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {restaurant.name} — menu
        </h1>
      </div>

      <ul className="space-y-3">
        {menuItems.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="font-medium text-slate-900">{item.item_name}</p>
              <p className="text-sm text-slate-500">
                {item.category ?? "Uncategorized"}
                {item.price !== null ? ` · LKR ${item.price}` : ""}
              </p>
            </div>
            <form action={deleteMenuItemAction.bind(null, item.id, id)}>
              <button
                type="submit"
                className="text-sm font-medium text-rose-600 hover:text-rose-700"
              >
                Delete
              </button>
            </form>
          </li>
        ))}
        {menuItems.length === 0 ? (
          <p className="text-sm text-slate-500">No menu items yet.</p>
        ) : null}
      </ul>

      <form
        action={createMenuItemAction.bind(null, id)}
        className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6"
      >
        <h2 className="text-lg font-semibold text-slate-900">Add menu item</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Name
            <input
              name="item_name"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Category
            <input
              name="category"
              placeholder="Mains, Beverages, Desserts"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Price (LKR)
            <input
              name="price"
              type="number"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Photo URL
            <input
              name="photo_url"
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">
          Description
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Add item
        </button>
      </form>
    </div>
  );
}
