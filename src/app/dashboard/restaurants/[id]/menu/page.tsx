import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteMenuItemButton } from "@/components/owner/DeleteMenuItemButton";
import { ListingStateBadge } from "@/components/owner/ListingStateBadge";
import { MenuItemForm } from "@/components/owner/MenuItemForm";
import { requireOwner } from "@/lib/auth/guard";
import { getMenuItems, type OwnerMenuItem } from "@/lib/data/menu-items";
import { getMyRestaurant } from "@/lib/data/restaurants";
import { formatLkr } from "@/lib/format";
import { canOwnerEdit, listingState } from "@/lib/owner-status";
import { createMenuItemAction, deleteMenuItemAction } from "../../actions";

function groupByCategory(items: OwnerMenuItem[]): [string, OwnerMenuItem[]][] {
  const groups = new Map<string, OwnerMenuItem[]>();
  for (const item of items) {
    const category = item.category ?? "Other";
    groups.set(category, [...(groups.get(category) ?? []), item]);
  }
  return [...groups.entries()];
}

export default async function MenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const { owner } = await requireOwner();

  const restaurant = await getMyRestaurant(owner.id, id);
  if (!restaurant) {
    notFound();
  }

  const items = await getMenuItems(restaurant.id);
  const canEdit = canOwnerEdit(owner.status);
  const categories = [
    ...new Set(items.map((item) => item.category).filter((c): c is string => !!c)),
  ];

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/restaurants/${restaurant.id}`}
        className="text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        ← {restaurant.name}
      </Link>
      <h1 className="text-2xl font-semibold text-slate-900">Menu</h1>

      {query.saved ? (
        <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Menu item saved.
        </p>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No menu items yet. Customers decide on prices as much as vibe, so
          add your most popular dishes and drinks with their prices.
        </div>
      ) : (
        <div className="space-y-6">
          {groupByCategory(items).map(([category, categoryItems]) => (
            <section key={category} className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {category}
              </h2>
              <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
                {categoryItems.map((item) => (
                  <li key={item.id} className="space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">
                          {item.item_name}
                          {item.price !== null ? (
                            <span className="ml-2 font-normal text-slate-600">
                              {formatLkr(item.price)}
                            </span>
                          ) : null}
                        </p>
                        {item.description ? (
                          <p className="text-sm text-slate-500">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-4">
                        {item.hidden_by_admin ? (
                          <ListingStateBadge
                            state={listingState(item, owner.status)}
                          />
                        ) : null}
                        {canEdit ? (
                          <>
                            <Link
                              href={`/dashboard/restaurants/${restaurant.id}/menu/${item.id}`}
                              className="text-sm font-medium text-slate-900 hover:underline"
                            >
                              Edit
                            </Link>
                            <DeleteMenuItemButton
                              action={deleteMenuItemAction.bind(
                                null,
                                restaurant.id,
                                item.id,
                              )}
                              itemName={item.item_name}
                            />
                          </>
                        ) : null}
                      </div>
                    </div>
                    {item.hidden_by_admin ? (
                      <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-800">
                        {item.moderation_note ??
                          "Hidden after a review by the Kamu team."}{" "}
                        Customers can&apos;t see this item.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {canEdit ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Add an item</h2>
          <MenuItemForm
            action={createMenuItemAction.bind(null, restaurant.id)}
            ownerId={owner.id}
            categories={categories}
            submitLabel="Add to menu"
          />
        </section>
      ) : null}
    </div>
  );
}
