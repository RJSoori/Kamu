import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "./restaurants";

export interface OwnerMenuItem {
  id: string;
  restaurant_id: string;
  item_name: string;
  description: string | null;
  price: number | null;
  photo_url: string | null;
  category: string | null;
  hidden_by_admin: boolean;
  moderation_note: string | null;
  created_at: string;
}

export type MenuItemInput = Omit<
  OwnerMenuItem,
  "id" | "restaurant_id" | "hidden_by_admin" | "moderation_note" | "created_at"
>;

const MENU_ITEM_COLUMNS =
  "id, restaurant_id, item_name, description, price, photo_url, category, hidden_by_admin, moderation_note, created_at";

/*
 * Callers must first confirm the restaurant belongs to the owner
 * (getMyRestaurant) -- that's what scopes these to "my menu". RLS backs it
 * up: menu_items_*_owner policies only allow writes through a restaurant
 * whose owner_id is the caller, and every write below is also pinned to
 * restaurant_id so an item can't be edited via another restaurant's URL.
 */

export async function getMenuItems(
  restaurantId: string,
): Promise<OwnerMenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("category", { ascending: true, nullsFirst: false })
    .order("item_name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OwnerMenuItem[];
}

export async function getMenuItem(
  restaurantId: string,
  id: string,
): Promise<OwnerMenuItem | null> {
  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_COLUMNS)
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnerMenuItem | null;
}

export async function createMenuItem(
  restaurantId: string,
  input: MenuItemInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .insert({ ...input, restaurant_id: restaurantId });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMenuItem(
  restaurantId: string,
  id: string,
  input: MenuItemInput,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update(input)
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteMenuItem(
  restaurantId: string,
  id: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(error.message);
  }
}
