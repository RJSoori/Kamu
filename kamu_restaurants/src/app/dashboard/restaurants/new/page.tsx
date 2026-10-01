import Link from "next/link";
import { redirect } from "next/navigation";
import { RestaurantForm } from "@/components/owner/RestaurantForm";
import { requireOwner } from "@/lib/auth/guard";
import { getKnownAreas } from "@/lib/data/restaurants";
import { canOwnerEdit } from "@/lib/owner-status";
import { hoursFromStored } from "@/lib/validation/restaurant";
import { createRestaurantAction } from "../actions";

export default async function NewRestaurantPage() {
  const { owner } = await requireOwner();
  if (!canOwnerEdit(owner.status)) {
    redirect("/dashboard");
  }

  const knownAreas = await getKnownAreas();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Your restaurants
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">
        Add your restaurant
      </h1>

      <RestaurantForm
        action={createRestaurantAction}
        hours={hoursFromStored(null)}
        ownerId={owner.id}
        ownerStatus={owner.status}
        knownAreas={knownAreas}
        submitLabel="Create listing"
      />
    </div>
  );
}
