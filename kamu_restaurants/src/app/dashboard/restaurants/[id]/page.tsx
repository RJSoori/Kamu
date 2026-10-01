import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingStateBadge } from "@/components/owner/ListingStateBadge";
import { RestaurantForm } from "@/components/owner/RestaurantForm";
import { requireOwner } from "@/lib/auth/guard";
import { getKnownAreas, getMyRestaurant } from "@/lib/data/restaurants";
import { canOwnerEdit, listingState } from "@/lib/owner-status";
import { hoursFromStored } from "@/lib/validation/restaurant";
import { updateRestaurantAction } from "../actions";

export default async function EditRestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; embed?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { owner } = await requireOwner();

  const restaurant = await getMyRestaurant(owner.id, id);
  if (!restaurant) {
    notFound();
  }

  const knownAreas = await getKnownAreas();
  const canEdit = canOwnerEdit(owner.status);

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Your restaurants
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {restaurant.name}
          </h1>
          <Link
            href={`/dashboard/restaurants/${restaurant.id}/menu`}
            className="mt-1 inline-block text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
          >
            Edit the menu →
          </Link>
        </div>
        <ListingStateBadge state={listingState(restaurant, owner.status)} />
      </div>

      {query.created ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your restaurant is saved. Next, add your menu.
          {query.embed === "lagging"
            ? " (Mood search hasn't picked up your vibe description yet; it will try again the next time you save.)"
            : ""}
        </p>
      ) : null}

      {restaurant.hidden_by_admin ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <p className="font-semibold">Hidden by Kamu</p>
          <p className="mt-1">
            {restaurant.moderation_note ??
              "This listing was hidden after a review by the Kamu team."}{" "}
            Customers can&apos;t see it until the Kamu team restores it.
          </p>
        </div>
      ) : null}

      <RestaurantForm
        action={updateRestaurantAction.bind(null, restaurant.id)}
        restaurant={restaurant}
        hours={hoursFromStored(restaurant.opening_hours)}
        ownerId={owner.id}
        ownerStatus={owner.status}
        knownAreas={knownAreas}
        submitLabel="Save changes"
        readOnly={!canEdit}
      />
    </div>
  );
}
