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
  hidden_by_admin: boolean;
  moderation_note: string | null;
  created_at: string;
}

export type MenuItemInput = Omit<
  MenuItem,
  "id" | "created_at" | "hidden_by_admin" | "moderation_note"
>;

const MENU_ITEM_COLUMNS =
  "id, restaurant_id, item_name, description, price, photo_url, category, hidden_by_admin, moderation_note, created_at";

/** Hidden items included: admins see everything through RLS. */
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

export async function deleteMenuItem(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Admin-only in practice: a trigger keeps the old values for non-admins. */
export async function setMenuItemHidden(
  id: string,
  hidden: boolean,
  note: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ hidden_by_admin: hidden, moderation_note: hidden ? note : null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
