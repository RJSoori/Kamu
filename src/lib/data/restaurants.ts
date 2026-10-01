import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * The owner's view of a restaurant: kamu's Restaurant (kamu/src/lib/data/
 * restaurants.ts) plus the ownership and moderation columns. Same table,
 * same Supabase project.
 */
export interface OwnerRestaurant {
  id: string;
  owner_id: string;
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
  hidden_by_admin: boolean;
  moderation_note: string | null;
  created_at: string;
}

/** Everything an owner may write. owner_id is set by the data layer itself. */
export type RestaurantInput = Omit<
  OwnerRestaurant,
  "id" | "owner_id" | "hidden_by_admin" | "moderation_note" | "created_at"
>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Ids come from URLs; a malformed one is "not found", not a DB error. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

export const OWNER_RESTAURANT_COLUMNS =
  "id, owner_id, name, area, address, latitude, longitude, cuisine_type, price_range, vibe_description, opening_hours, cover_photo_url, is_published, hidden_by_admin, moderation_note, created_at";

/*
 * Every query is scoped with .eq("owner_id", ownerId) on top of RLS. RLS
 * alone would also return every PUBLIC restaurant (restaurants_select_
 * published_or_admin applies to owners too), and writes are additionally
 * guarded by the restaurants_*_owner policies + restaurants_guard trigger.
 */

export async function getMyRestaurants(
  ownerId: string,
): Promise<OwnerRestaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(OWNER_RESTAURANT_COLUMNS)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as OwnerRestaurant[];
}

export async function getMyRestaurant(
  ownerId: string,
  id: string,
): Promise<OwnerRestaurant | null> {
  if (!isUuid(id)) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select(OWNER_RESTAURANT_COLUMNS)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnerRestaurant | null;
}

export async function createRestaurant(
  ownerId: string,
  input: RestaurantInput,
): Promise<OwnerRestaurant> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .insert({ ...input, owner_id: ownerId })
    .select(OWNER_RESTAURANT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnerRestaurant;
}

export async function updateRestaurant(
  ownerId: string,
  id: string,
  input: RestaurantInput,
): Promise<OwnerRestaurant> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .update(input)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select(OWNER_RESTAURANT_COLUMNS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as OwnerRestaurant;
}

/**
 * Areas already used by restaurants this owner can see (all public ones
 * plus their own), for the area field's suggestions. Picking an existing
 * spelling keeps the customer site's area filter from splitting
 * "Colombo 03" and "Colombo 3" into two options.
 */
export async function getKnownAreas(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("restaurants").select("area");

  if (error) {
    throw new Error(error.message);
  }

  return [...new Set((data ?? []).map((row) => row.area as string))]
    .filter(Boolean)
    .sort();
}

/**
 * Whether mood search has an embedding for this restaurant yet. Checked with
 * a filter rather than by selecting the 384-number vector itself.
 */
export async function hasMoodSearchEmbedding(
  restaurantId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id")
    .eq("id", restaurantId)
    .not("vibe_embedding", "is", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

/**
 * Re-embeds the restaurant's vibe_description for mood search via the
 * embed-restaurant Edge Function (owners can't write vibe_embedding
 * themselves). Returns false instead of throwing: the listing itself is
 * already saved, so a failure here only means mood search lags behind.
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
