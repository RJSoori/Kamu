import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface Restaurant {
  id: string;
  name: string;
  area: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  cuisine_type: string[] | null;
  price_range: string | null;
  vibe_description: string | null;
  opening_hours: Record<string, unknown> | null;
  cover_photo_url: string | null;
  is_published: boolean;
  // null = admin-managed listing (no owner account)
  owner_id: string | null;
  hidden_by_admin: boolean;
  moderation_note: string | null;
  created_at: string;
}

export type RestaurantInput = Omit<
  Restaurant,
  | "id"
  | "created_at"
  | "is_published"
  | "owner_id"
  | "hidden_by_admin"
  | "moderation_note"
> & {
  is_published?: boolean;
};

const RESTAURANT_COLUMNS =
  "id, name, area, address, latitude, longitude, cuisine_type, price_range, vibe_description, opening_hours, cover_photo_url, is_published, owner_id, hidden_by_admin, moderation_note, created_at";

/** Every restaurant, drafts and hidden ones included (admin RLS). */
export async function getRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Restaurant[];
}

export async function getRestaurantById(
  id: string,
): Promise<Restaurant | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(RESTAURANT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as Restaurant | null;
}

export async function createRestaurant(
  input: RestaurantInput,
): Promise<Restaurant> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .insert(input)
    .select(RESTAURANT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Restaurant;
}

export async function updateRestaurant(
  id: string,
  input: Partial<RestaurantInput>,
): Promise<Restaurant> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(input)
    .eq("id", id)
    .select(RESTAURANT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Restaurant;
}

export async function deleteRestaurant(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("restaurants").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setRestaurantPublished(
  id: string,
  isPublished: boolean,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ is_published: isPublished })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Admin-only in practice: a trigger keeps the old values for non-admins. */
export async function setRestaurantHidden(
  id: string,
  hidden: boolean,
  note: string | null,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ hidden_by_admin: hidden, moderation_note: hidden ? note : null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Re-embeds the restaurant's vibe_description for mood search via the
 * embed-restaurant Edge Function (vibe_embedding can't be written directly;
 * the function authorizes admins through can_edit_restaurant()). Returns
 * false instead of throwing: the listing itself is already saved, so a
 * failure only means mood search lags until the next save.
 */
export async function refreshMoodSearchEmbedding(
  restaurantId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("embed-restaurant", {
    body: { restaurant_id: restaurantId },
  });

  if (error) {
    console.error("embed-restaurant failed:", error.message);
    return false;
  }

  return true;
}
