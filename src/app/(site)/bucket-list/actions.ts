"use server";

import { revalidatePath } from "next/cache";
import {
  addToBucketList,
  removeFromBucketList,
} from "@/lib/data/bucket-list";

export interface BucketListActionResult {
  error: string | null;
}

export async function saveRestaurant(
  restaurantId: string,
): Promise<BucketListActionResult> {
  try {
    await addToBucketList(restaurantId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save restaurant.",
    };
  }

  revalidatePath("/bucket-list");
  return { error: null };
}

export async function unsaveRestaurant(
  restaurantId: string,
): Promise<BucketListActionResult> {
  try {
    await removeFromBucketList(restaurantId);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to remove restaurant.",
    };
  }

  revalidatePath("/bucket-list");
  return { error: null };
}
