"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UnauthorizedError, requireActiveOwner } from "@/lib/auth/guard";
import {
  createMenuItem,
  deleteMenuItem,
  getMenuItem,
  updateMenuItem,
} from "@/lib/data/menu-items";
import {
  createRestaurant,
  getMyRestaurant,
  hasMoodSearchEmbedding,
  refreshMoodSearchEmbedding,
  updateRestaurant,
} from "@/lib/data/restaurants";
import { ownerPhotoUrlPrefix } from "@/lib/photos";
import {
  parseMenuItemForm,
  parseRestaurantForm,
} from "@/lib/validation/restaurant";

export interface DashboardFormState {
  error: string | null;
  notice: string | null;
  /** Set on each successful save, so "add another" forms can reset. */
  savedAt: number | null;
}

const SAVE_FAILED = "We couldn't save that. Please try again in a moment.";
const EMBED_LAGGING =
  "Saved. Mood search hasn't picked up your vibe description yet -- it will try again the next time you save.";

function failure(error: string): DashboardFormState {
  return { error, notice: null, savedAt: null };
}

/**
 * Every write goes through here first. Signed-out / non-owner sessions are
 * sent to /login (which sorts out each signed-in state); rejected or
 * suspended owners get a form error. RLS enforces the same thing in the DB.
 */
async function activeOwner() {
  try {
    const { owner } = await requireActiveOwner();
    return { owner, error: null };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      if (error.reason === "inactive_owner") {
        return { owner: null, error: error.message };
      }
      redirect("/login?next=/dashboard");
    }
    throw error;
  }
}

/**
 * Keeps mood search in step with the listing: re-embeds when the vibe
 * description changed, or when an earlier attempt never produced an
 * embedding. Returns false if mood search is (still) behind.
 */
async function syncMoodSearch(
  restaurantId: string,
  vibeDescription: string | null,
  previousVibeDescription: string | null,
): Promise<boolean> {
  if (!vibeDescription) {
    return true;
  }

  const needsEmbedding =
    vibeDescription !== previousVibeDescription ||
    !(await hasMoodSearchEmbedding(restaurantId));

  return needsEmbedding ? refreshMoodSearchEmbedding(restaurantId) : true;
}

export async function createRestaurantAction(
  _prevState: DashboardFormState,
  formData: FormData,
): Promise<DashboardFormState> {
  const { owner, error } = await activeOwner();
  if (!owner) {
    return failure(error);
  }

  const parsed = parseRestaurantForm(formData, ownerPhotoUrlPrefix(owner.id));
  if (!parsed.ok) {
    return failure(parsed.error);
  }

  let restaurantId: string;
  let moodSearchInSync: boolean;
  try {
    const restaurant = await createRestaurant(owner.id, parsed.data);
    restaurantId = restaurant.id;
    moodSearchInSync = await syncMoodSearch(
      restaurant.id,
      restaurant.vibe_description,
      null,
    );
  } catch (saveError) {
    console.error("createRestaurantAction failed:", saveError);
    return failure(SAVE_FAILED);
  }

  revalidatePath("/dashboard");
  redirect(
    `/dashboard/restaurants/${restaurantId}?created=1${moodSearchInSync ? "" : "&embed=lagging"}`,
  );
}

export async function updateRestaurantAction(
  restaurantId: string,
  _prevState: DashboardFormState,
  formData: FormData,
): Promise<DashboardFormState> {
  const { owner, error } = await activeOwner();
  if (!owner) {
    return failure(error);
  }

  const parsed = parseRestaurantForm(formData, ownerPhotoUrlPrefix(owner.id));
  if (!parsed.ok) {
    return failure(parsed.error);
  }

  let moodSearchInSync: boolean;
  try {
    const existing = await getMyRestaurant(owner.id, restaurantId);
    if (!existing) {
      return failure("This restaurant wasn't found in your account.");
    }

    await updateRestaurant(owner.id, restaurantId, parsed.data);
    moodSearchInSync = await syncMoodSearch(
      restaurantId,
      parsed.data.vibe_description,
      existing.vibe_description,
    );
  } catch (saveError) {
    console.error("updateRestaurantAction failed:", saveError);
    return failure(SAVE_FAILED);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/restaurants/${restaurantId}`);
  return {
    error: null,
    notice: moodSearchInSync ? "Saved." : EMBED_LAGGING,
    savedAt: Date.now(),
  };
}

export async function createMenuItemAction(
  restaurantId: string,
  _prevState: DashboardFormState,
  formData: FormData,
): Promise<DashboardFormState> {
  const { owner, error } = await activeOwner();
  if (!owner) {
    return failure(error);
  }

  const parsed = parseMenuItemForm(formData, ownerPhotoUrlPrefix(owner.id));
  if (!parsed.ok) {
    return failure(parsed.error);
  }

  try {
    if (!(await getMyRestaurant(owner.id, restaurantId))) {
      return failure("This restaurant wasn't found in your account.");
    }
    await createMenuItem(restaurantId, parsed.data);
  } catch (saveError) {
    console.error("createMenuItemAction failed:", saveError);
    return failure(SAVE_FAILED);
  }

  revalidatePath(`/dashboard/restaurants/${restaurantId}/menu`);
  return {
    error: null,
    notice: `Added ${parsed.data.item_name}.`,
    savedAt: Date.now(),
  };
}

export async function updateMenuItemAction(
  restaurantId: string,
  itemId: string,
  _prevState: DashboardFormState,
  formData: FormData,
): Promise<DashboardFormState> {
  const { owner, error } = await activeOwner();
  if (!owner) {
    return failure(error);
  }

  const parsed = parseMenuItemForm(formData, ownerPhotoUrlPrefix(owner.id));
  if (!parsed.ok) {
    return failure(parsed.error);
  }

  try {
    if (
      !(await getMyRestaurant(owner.id, restaurantId)) ||
      !(await getMenuItem(restaurantId, itemId))
    ) {
      return failure("This menu item wasn't found in your account.");
    }
    await updateMenuItem(restaurantId, itemId, parsed.data);
  } catch (saveError) {
    console.error("updateMenuItemAction failed:", saveError);
    return failure(SAVE_FAILED);
  }

  revalidatePath(`/dashboard/restaurants/${restaurantId}/menu`);
  redirect(`/dashboard/restaurants/${restaurantId}/menu?saved=1`);
}

export async function deleteMenuItemAction(
  restaurantId: string,
  itemId: string,
): Promise<void> {
  const { owner } = await activeOwner();
  if (!owner || !(await getMyRestaurant(owner.id, restaurantId))) {
    return;
  }

  await deleteMenuItem(restaurantId, itemId);
  revalidatePath(`/dashboard/restaurants/${restaurantId}/menu`);
}
