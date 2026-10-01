"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import {
  createMenuItem,
  deleteMenuItem,
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
    photo_url: String(formData.get("photo_url") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
  };

  await createMenuItem(input);
  revalidatePath(`/admin/restaurants/${restaurantId}/menu-items`);
}

export async function deleteMenuItemAction(
  itemId: string,
  restaurantId: string,
) {
  await requireAdmin();
  await deleteMenuItem(itemId);
  revalidatePath(`/admin/restaurants/${restaurantId}/menu-items`);
}
