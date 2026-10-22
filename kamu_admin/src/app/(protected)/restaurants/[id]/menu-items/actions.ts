"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { checkPhotoUrl } from "@/lib/photos";
import {
  createMenuItem,
  deleteMenuItem,
  setMenuItemHidden,
  type MenuItemInput,
} from "@/lib/data/menu-items";

export async function createMenuItemAction(
  restaurantId: string,
  formData: FormData,
) {
  await requireAdmin();

  const itemName = String(formData.get("item_name") ?? "").trim();
  if (!itemName) {
    throw new Error("Item name is required.");
  }

  const priceRaw = String(formData.get("price") ?? "").trim();

  const input: MenuItemInput = {
    restaurant_id: restaurantId,
    item_name: itemName,
    description: String(formData.get("description") ?? "").trim() || null,
    price: priceRaw ? Number(priceRaw) : null,
    photo_url: checkPhotoUrl(
      String(formData.get("photo_url") ?? "").trim() || null,
    ),
    category: String(formData.get("category") ?? "").trim() || null,
  };

  await createMenuItem(input);
  revalidatePath(`/restaurants/${restaurantId}/menu-items`);
}

export async function deleteMenuItemAction(
  itemId: string,
  restaurantId: string,
) {
  await requireAdmin();
  await deleteMenuItem(itemId);
  revalidatePath(`/restaurants/${restaurantId}/menu-items`);
}

/** hidden=true needs a moderation_note in formData: the owner sees it. */
export async function setMenuItemHiddenAction(
  itemId: string,
  restaurantId: string,
  hidden: boolean,
  formData: FormData,
) {
  await requireAdmin();
  const note = String(formData.get("moderation_note") ?? "").trim() || null;

  if (hidden && !note) {
    throw new Error("Tell the owner why it's hidden.");
  }

  await setMenuItemHidden(itemId, hidden, note);
  revalidatePath("/", "layout");
}
