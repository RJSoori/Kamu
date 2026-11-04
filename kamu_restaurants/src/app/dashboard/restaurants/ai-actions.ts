"use server";

import { revalidatePath } from "next/cache";
import { UnauthorizedError, requireActiveOwner } from "@/lib/auth/guard";
import {
  answerCoach,
  checkListing,
  readMenuPhoto,
  startCoach,
  suggestListing,
  type ImportedMenuItem,
  type ListingForm,
} from "@/lib/data/ai-help";
import { createMenuItems, getMenuItem, updateMenuItem } from "@/lib/data/menu-items";
import { getMyRestaurant, isUuid } from "@/lib/data/restaurants";
import { env } from "@/lib/env";
import { PHOTO_BUCKET, ownerPhotoUrlPrefix } from "@/lib/photos";
import { parseMenuItemForm, parsePhotoUrl, type MenuItemFormData } from "@/lib/validation/restaurant";

/*
 * Server actions for the owner AI helpers: menu import (MenuImport) and
 * listing help (ListingHelper). The AI only suggests; saving still goes
 * through the same validation and data layer as the hand-written forms.
 */

async function ownerOrError() {
  try {
    const { owner } = await requireActiveOwner();
    return { owner, error: null };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { owner: null, error: error.message };
    }
    throw error;
  }
}

// ---------------------------------------------------------------- menu import

export interface MenuReadState {
  error: string | null;
  items: ImportedMenuItem[] | null;
}

/** Step 1: read the uploaded photo. Nothing is saved. */
export async function readMenuPhotoAction(
  restaurantId: string,
  _prevState: MenuReadState,
  formData: FormData,
): Promise<MenuReadState> {
  const { owner, error } = await ownerOrError();
  if (!owner) return { error, items: null };

  const photo = parsePhotoUrl(String(formData.get("menu_photo_url") ?? ""), ownerPhotoUrlPrefix(owner.id));
  if (!photo.ok || !photo.data) {
    return { error: photo.ok ? "Upload a photo of your menu first." : photo.error, items: null };
  }
  if (!(await getMyRestaurant(owner.id, restaurantId))) {
    return { error: "This restaurant wasn't found in your account.", items: null };
  }

  // The function takes the storage path, not a URL: "owners/<uid>/<file>".
  const bucketUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/`;
  const result = await readMenuPhoto(restaurantId, photo.data.slice(bucketUrl.length));
  if (!result.ok) return { error: result.error, items: null };
  if (!result.data.is_menu || result.data.items.length === 0) {
    return { error: "No menu items found on that photo. Try a clearer, straight-on photo.", items: null };
  }
  return { error: null, items: result.data.items };
}

export interface MenuSaveState {
  error: string | null;
  notice: string | null;
}

/**
 * Step 2: save the rows the owner ticked. Rows arrive as items.<n>.<field>.
 * New dishes go through the same parser as the "Add an item" form; matched
 * dishes only get their price updated (their photo and text are kept).
 */
export async function saveImportedMenuAction(
  restaurantId: string,
  _prevState: MenuSaveState,
  formData: FormData,
): Promise<MenuSaveState> {
  const { owner, error } = await ownerOrError();
  if (!owner) return { error, notice: null };
  if (!(await getMyRestaurant(owner.id, restaurantId))) {
    return { error: "This restaurant wasn't found in your account.", notice: null };
  }

  const rows = new Set<string>();
  for (const key of formData.keys()) {
    const match = /^items\.(\d+)\.include$/.exec(key);
    if (match) rows.add(match[1]);
  }
  if (rows.size === 0) return { error: "Tick at least one dish to add.", notice: null };

  const newItems: MenuItemFormData[] = [];
  const priceUpdates: { id: string; price: number }[] = [];
  for (const row of rows) {
    const get = (field: string) => String(formData.get(`items.${row}.${field}`) ?? "");
    const fields = new FormData();
    for (const field of ["item_name", "description", "price", "category"]) fields.set(field, get(field));
    const parsed = parseMenuItemForm(fields, ownerPhotoUrlPrefix(owner.id));
    if (!parsed.ok) {
      return { error: `${get("item_name") || "A dish"}: ${parsed.error}`, notice: null };
    }

    const existingId = get("existing_id");
    if (!existingId) {
      newItems.push(parsed.data);
    } else if (isUuid(existingId) && parsed.data.price !== null && (await getMenuItem(restaurantId, existingId))) {
      priceUpdates.push({ id: existingId, price: parsed.data.price });
    }
  }

  try {
    if (newItems.length) await createMenuItems(restaurantId, newItems);
    for (const { id, price } of priceUpdates) await updateMenuItem(restaurantId, id, { price });
  } catch (saveError) {
    console.error("saveImportedMenuAction failed:", saveError);
    return { error: "We couldn't save that. Please try again in a moment.", notice: null };
  }

  revalidatePath(`/dashboard/restaurants/${restaurantId}/menu`);
  const parts = [
    newItems.length ? `added ${newItems.length} dish${newItems.length === 1 ? "" : "es"}` : "",
    priceUpdates.length ? `updated ${priceUpdates.length} price${priceUpdates.length === 1 ? "" : "s"}` : "",
  ].filter(Boolean);
  return { error: null, notice: `Done: ${parts.join(" and ")}.` };
}

// ---------------------------------------------------------------- listing help

interface ListingInput {
  restaurantId: string | null;
  form: ListingForm;
  description: string;
}

/** Client-sent values, re-shaped so only plain strings reach the functions. */
function cleanInput(input: ListingInput): ListingInput {
  const s = (value: unknown) => (typeof value === "string" ? value : "");
  return {
    restaurantId: input.restaurantId && isUuid(input.restaurantId) ? input.restaurantId : null,
    form: {
      name: s(input.form?.name),
      area: s(input.form?.area),
      cuisine_type: s(input.form?.cuisine_type),
      price_range: s(input.form?.price_range),
    },
    description: s(input.description),
  };
}

export async function checkListingAction(description: string) {
  const { owner, error } = await ownerOrError();
  if (!owner) return { ok: false as const, error };
  return checkListing(typeof description === "string" ? description : "");
}

export async function suggestListingAction(input: ListingInput & { answers: Record<string, string> }) {
  const { owner, error } = await ownerOrError();
  if (!owner) return { ok: false as const, error };
  const answers = Object.fromEntries(
    Object.entries(input.answers ?? {}).filter(([, v]) => typeof v === "string"),
  );
  return suggestListing({ ...cleanInput(input), answers });
}

export async function startCoachAction(input: ListingInput) {
  const { owner, error } = await ownerOrError();
  if (!owner) return { ok: false as const, error };
  return startCoach(cleanInput(input));
}

export async function answerCoachAction(sessionId: string, answer: string) {
  const { owner, error } = await ownerOrError();
  if (!owner) return { ok: false as const, error };
  return answerCoach(String(sessionId), String(answer));
}
