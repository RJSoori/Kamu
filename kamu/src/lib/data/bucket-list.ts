import "server-only";
import { createClient } from "@/lib/supabase/server";
import { RESTAURANT_COLUMNS, type Restaurant } from "./restaurants";

export interface BucketListEntry {
  restaurant: Restaurant;
  saved_at: string;
}

/**
 * The signed-in customer's saved restaurants, most recently saved first.
 * Returns an empty list (not an error) when logged out -- callers that need
 * to distinguish "logged out" from "logged in with nothing saved" should
 * check auth separately (see the bucket-list page, which redirects to
 * /login rather than rendering an empty state for a logged-out visitor).
 */
export async function getBucketList(): Promise<BucketListEntry[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("bucket_lists")
    .select(`saved_at, restaurant:restaurants(${RESTAURANT_COLUMNS})`)
    .eq("customer_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    // A restaurant row can vanish out from under a bucket_lists row (admin
    // delete) faster than this list gets revalidated -- drop those rather
    // than render a broken card.
    .filter((row) => row.restaurant !== null)
    .map((row) => ({
      saved_at: row.saved_at,
      restaurant: row.restaurant as unknown as Restaurant,
    }));
}

/** Whether the signed-in customer already has this restaurant saved. False (not an error) when logged out. */
export async function isRestaurantSaved(restaurantId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from("bucket_lists")
    .select("id")
    .eq("customer_id", user.id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data !== null;
}

export async function addToBucketList(restaurantId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in to save restaurants.");
  }

  const { error } = await supabase
    .from("bucket_lists")
    .insert({ customer_id: user.id, restaurant_id: restaurantId });

  // 23505 = unique_violation on the (customer_id, restaurant_id) constraint
  // -- already saved (e.g. a double-click). Treat as success rather than
  // surfacing an error for what the user experiences as a no-op.
  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }
}

export async function removeFromBucketList(restaurantId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in to manage your bucket list.");
  }

  const { error } = await supabase
    .from("bucket_lists")
    .delete()
    .eq("customer_id", user.id)
    .eq("restaurant_id", restaurantId);

  if (error) {
    throw new Error(error.message);
  }
}
