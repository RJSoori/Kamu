import Link from "next/link";
import { ListingStateBadge } from "@/components/owner/ListingStateBadge";
import { StatusBanner } from "@/components/owner/StatusBanner";
import { requireOwner } from "@/lib/auth/guard";
import { getMyRestaurants } from "@/lib/data/restaurants";
import { canOwnerEdit, listingState } from "@/lib/owner-status";

export default async function DashboardPage() {
  // Already guarded by dashboard/layout.tsx; cached, so no second lookup.
  const { owner } = await requireOwner();
  const restaurants = await getMyRestaurants(owner.id);
  const canEdit = canOwnerEdit(owner.status);

  return (
    <div className="space-y-8">
      <StatusBanner status={owner.status} note={owner.status_note} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Your restaurants
          </h1>
          {owner.status === "approved" ? (
            <p className="mt-1 text-sm text-emerald-700">Verified owner</p>
          ) : null}
        </div>
        {canEdit ? (
          <Link
            href="/dashboard/restaurants/new"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Add a restaurant
          </Link>
        ) : null}
      </div>

      {restaurants.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">
            {canEdit
              ? "You haven't added a restaurant yet. Start with the basics; you can fill in the menu afterwards."
              : "You don't have any restaurants on Kamu."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {restaurants.map((restaurant) => (
            <li
              key={restaurant.id}
              className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {restaurant.name}
                  </h2>
                  <p className="text-sm text-slate-500">{restaurant.area}</p>
                </div>
                <ListingStateBadge
                  state={listingState(restaurant, owner.status)}
                />
              </div>

              {restaurant.hidden_by_admin && restaurant.moderation_note ? (
                <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  Note from Kamu: {restaurant.moderation_note}
                </p>
              ) : null}

              <div className="flex gap-4 text-sm font-medium">
                <Link
                  href={`/dashboard/restaurants/${restaurant.id}`}
                  className="text-slate-900 hover:underline"
                >
                  {canEdit ? "Edit details" : "View details"}
                </Link>
                <Link
                  href={`/dashboard/restaurants/${restaurant.id}/menu`}
                  className="text-slate-900 hover:underline"
                >
                  Menu
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
