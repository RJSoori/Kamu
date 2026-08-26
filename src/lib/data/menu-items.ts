import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface MenuItem {
  id: string;
  restaurant_id: string;
  item_name: string;
  description: string | null;
  price: number | null;
  photo_url: string | null;
  category: string | null;
  created_at: string;
}

export type MenuItemInput = Omit<MenuItem, "id" | "created_at">;

const MENU_ITEM_COLUMNS =
  "id, restaurant_id, item_name, description, price, photo_url, category, created_at";

/**
 * Menu items inherit their visibility from the parent restaurant's
 * is_published flag via RLS, so -- same as restaurants -- no manual
 * filtering here.
 */
export async function getMenuItemsByRestaurant(
  restaurantId: string,
): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(MENU_ITEM_COLUMNS)
    .eq("restaurant_id", restaurantId)
    .order("category", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MenuItem[];
}

/** Admin-only in practice: RLS rejects this for non-admin callers. */
export async function createMenuItem(
  input: MenuItemInput,
): Promise<MenuItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert(input)
    .select(MENU_ITEM_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MenuItem;
}

/** Admin-only in practice: RLS rejects this for non-admin callers. */
export async function updateMenuItem(
  id: string,
  input: Partial<MenuItemInput>,
): Promise<MenuItem> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .update(input)
    .eq("id", id)
    .select(MENU_ITEM_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MenuItem;
}

/** Admin-only in practice: RLS rejects this for non-admin callers. */
export async function deleteMenuItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
