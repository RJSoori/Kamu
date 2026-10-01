import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { MenuItemForm } from "@/components/owner/MenuItemForm";
import { requireOwner } from "@/lib/auth/guard";
import { getMenuItem, getMenuItems } from "@/lib/data/menu-items";
import { getMyRestaurant } from "@/lib/data/restaurants";
import { canOwnerEdit } from "@/lib/owner-status";
import { updateMenuItemAction } from "../../../actions";

export default async function EditMenuItemPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const { owner } = await requireOwner();

  const restaurant = await getMyRestaurant(owner.id, id);
  const item = restaurant ? await getMenuItem(restaurant.id, itemId) : null;
  if (!restaurant || !item) {
    notFound();
  }
  if (!canOwnerEdit(owner.status)) {
    redirect(`/dashboard/restaurants/${restaurant.id}/menu`);
  }

  const categories = [
    ...new Set(
      (await getMenuItems(restaurant.id))
        .map((menuItem) => menuItem.category)
        .filter((c): c is string => !!c),
    ),
  ];

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/restaurants/${restaurant.id}/menu`}
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← Menu
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">
        Edit {item.item_name}
      </h1>

      {item.hidden_by_admin ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Hidden by Kamu:{" "}
          {item.moderation_note ?? "hidden after a review by the Kamu team."}{" "}
          Saving changes won&apos;t make it visible again; the Kamu team
          restores hidden items.
        </p>
      ) : null}

      <MenuItemForm
        action={updateMenuItemAction.bind(null, restaurant.id, item.id)}
        item={item}
        ownerId={owner.id}
        categories={categories}
        submitLabel="Save item"
      />
    </div>
  );
}
