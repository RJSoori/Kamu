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
  created_at: string;
}

export type RestaurantInput = Omit<
  Restaurant,
  "id" | "created_at" | "is_published"
> & {
  is_published?: boolean;
};

const RESTAURANT_COLUMNS =
  "id, name, area, address, latitude, longitude, cuisine_type, price_range, vibe_description, opening_hours, cover_photo_url, is_published, created_at";

/**
 * Lists restaurants visible to the current caller. Deliberately does NOT
 * filter by is_published in application code -- RLS already does that at
 * the database layer (anon/customer sessions only ever see published rows;
 * an authenticated admin session sees drafts too via the is_admin() policy).
 * That's what lets the same function power both the public homepage and the
 * admin restaurant list.
 */
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

/** Admin-only in practice: RLS rejects this for non-admin callers. */
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

/** Admin-only in practice: RLS rejects this for non-admin callers. */
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

/** Admin-only in practice: RLS rejects this for non-admin callers. */
export async function deleteRestaurant(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("restaurants").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

/** Admin-only in practice: RLS rejects this for non-admin callers. */
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
