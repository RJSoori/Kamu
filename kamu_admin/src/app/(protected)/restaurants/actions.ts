"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import { checkPhotoUrl } from "@/lib/photos";
import {
  createRestaurant,
  deleteRestaurant,
  refreshMoodSearchEmbedding,
  setRestaurantHidden,
  setRestaurantPublished,
  updateRestaurant,
  type RestaurantInput,
} from "@/lib/data/restaurants";

function parseRestaurantForm(formData: FormData): RestaurantInput {
  const cuisineRaw = String(formData.get("cuisine_type") ?? "").trim();
  const openingHoursRaw = String(formData.get("opening_hours") ?? "").trim();
  const latitudeRaw = String(formData.get("latitude") ?? "").trim();
  const longitudeRaw = String(formData.get("longitude") ?? "").trim();

  let opening_hours: Record<string, unknown> | null = null;
  if (openingHoursRaw) {
    try {
      opening_hours = JSON.parse(openingHoursRaw);
    } catch {
      throw new Error("Opening hours must be valid JSON, e.g. {\"mon\": \"8:00-20:00\"}.");
    }
  }

  return {
    name: String(formData.get("name") ?? "").trim(),
    area: String(formData.get("area") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim() || null,
    latitude: latitudeRaw ? Number(latitudeRaw) : null,
    longitude: longitudeRaw ? Number(longitudeRaw) : null,
    cuisine_type: cuisineRaw
      ? cuisineRaw
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      : null,
    price_range: String(formData.get("price_range") ?? "").trim() || null,
    vibe_description:
      String(formData.get("vibe_description") ?? "").trim() || null,
    opening_hours,
    cover_photo_url: checkPhotoUrl(
      String(formData.get("cover_photo_url") ?? "").trim() || null,
    ),
    is_published: formData.get("is_published") === "on",
  };
}

export async function createRestaurantAction(formData: FormData) {
  await requireAdmin();
  const input = parseRestaurantForm(formData);

  if (!input.name || !input.area) {
    throw new Error("Name and area are required.");
  }

  const restaurant = await createRestaurant(input);
  if (input.vibe_description) {
    await refreshMoodSearchEmbedding(restaurant.id);
  }
  revalidatePath("/restaurants");
  redirect(`/restaurants/${restaurant.id}/edit`);
}

export async function updateRestaurantAction(id: string, formData: FormData) {
  await requireAdmin();
  const input = parseRestaurantForm(formData);

  if (!input.name || !input.area) {
    throw new Error("Name and area are required.");
  }

  await updateRestaurant(id, input);
  // Always re-embed: cheap at this scale, and also repairs a missed earlier attempt.
  if (input.vibe_description) {
    await refreshMoodSearchEmbedding(id);
  }
  revalidatePath("/restaurants");
  revalidatePath(`/restaurants/${id}/edit`);
}

export async function deleteRestaurantAction(id: string) {
  await requireAdmin();
  await deleteRestaurant(id);
  revalidatePath("/restaurants");
}

export async function setRestaurantPublishedAction(
  id: string,
  isPublished: boolean,
) {
  await requireAdmin();
  await setRestaurantPublished(id, isPublished);
  revalidatePath("/restaurants");
}

/** hidden=true needs a moderation_note in formData: the owner sees it. */
export async function setRestaurantHiddenAction(
  id: string,
  hidden: boolean,
  formData: FormData,
) {
  await requireAdmin();
  const note = String(formData.get("moderation_note") ?? "").trim() || null;

  if (hidden && !note) {
    throw new Error("Tell the owner why it's hidden.");
  }

  await setRestaurantHidden(id, hidden, note);
  revalidatePath("/", "layout");
}
