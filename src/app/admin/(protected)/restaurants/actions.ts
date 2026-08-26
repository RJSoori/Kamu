"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/guard";
import {
  createRestaurant,
  deleteRestaurant,
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
    cover_photo_url:
      String(formData.get("cover_photo_url") ?? "").trim() || null,
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
  revalidatePath("/admin/restaurants");
  redirect(`/admin/restaurants/${restaurant.id}/edit`);
}

export async function updateRestaurantAction(id: string, formData: FormData) {
  await requireAdmin();
  const input = parseRestaurantForm(formData);

  if (!input.name || !input.area) {
    throw new Error("Name and area are required.");
  }

  await updateRestaurant(id, input);
  revalidatePath("/admin/restaurants");
  revalidatePath(`/admin/restaurants/${id}/edit`);
}

export async function deleteRestaurantAction(id: string) {
  await requireAdmin();
  await deleteRestaurant(id);
  revalidatePath("/admin/restaurants");
}

export async function setRestaurantPublishedAction(
  id: string,
  isPublished: boolean,
) {
  await requireAdmin();
  await setRestaurantPublished(id, isPublished);
  revalidatePath("/admin/restaurants");
  revalidatePath("/");
}
