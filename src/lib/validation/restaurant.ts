import { z } from "zod";

/**
 * Parsing + validation for the owner dashboard's restaurant and menu-item
 * forms. Pure functions over FormData so they're unit-testable; the
 * database (column types, RLS, guard triggers) is still the real boundary.
 */

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

// ---------------------------------------------------------------------
// Opening hours
// ---------------------------------------------------------------------

export const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
] as const;

export type DayKey = (typeof DAYS)[number]["key"];

/** One day as the form edits it: <input type="time"> values ("07:30"). */
export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export type WeekHours = Record<DayKey, DayHours>;

const STORED_RANGE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;
const TIME_INPUT = /^([01]\d|2[0-3]):([0-5]\d)$/;

function pad(hours: string): string {
  return hours.padStart(2, "0");
}

/**
 * Stored format (restaurants.opening_hours, what kamu's restaurant page
 * renders and the seed data uses): { "mon": "7:30-19:00", "sun": "Closed" }.
 * Days missing from the object, or holding text this editor can't parse,
 * come back blank.
 */
export function hoursFromStored(
  stored: Record<string, unknown> | null | undefined,
): WeekHours {
  const week = {} as WeekHours;

  for (const { key } of DAYS) {
    const value = typeof stored?.[key] === "string" ? stored[key].trim() : "";
    const match = STORED_RANGE.exec(value);

    if (/^closed$/i.test(value)) {
      week[key] = { open: "", close: "", closed: true };
    } else if (match) {
      week[key] = {
        open: `${pad(match[1])}:${match[2]}`,
        close: `${pad(match[3])}:${match[4]}`,
        closed: false,
      };
    } else {
      week[key] = { open: "", close: "", closed: false };
    }
  }

  return week;
}

function toStoredTime(time: string): string {
  // "07:30" -> "7:30", matching the seed data's format.
  return time.replace(/^0(\d)/, "$1");
}

/**
 * Reads `hours.<day>.open|close|closed` fields. A day with neither time and
 * not marked closed is just left out (unknown). Overnight ranges like
 * 18:00-02:00 are allowed.
 */
export function parseOpeningHours(
  formData: FormData,
): ParseResult<Record<string, string> | null> {
  const stored: Record<string, string> = {};

  for (const { key, label } of DAYS) {
    const closed = formData.get(`hours.${key}.closed`) === "on";
    const open = String(formData.get(`hours.${key}.open`) ?? "").trim();
    const close = String(formData.get(`hours.${key}.close`) ?? "").trim();

    if (closed) {
      stored[key] = "Closed";
      continue;
    }
    if (!open && !close) {
      continue;
    }
    if (!open || !close) {
      return {
        ok: false,
        error: `${label}: enter both an opening and a closing time, or mark it closed.`,
      };
    }
    if (!TIME_INPUT.test(open) || !TIME_INPUT.test(close)) {
      return { ok: false, error: `${label}: times must look like 08:30.` };
    }
    if (open === close) {
      return {
        ok: false,
        error: `${label}: opening and closing times can't be the same.`,
      };
    }

    stored[key] = `${toStoredTime(open)}-${toStoredTime(close)}`;
  }

  return {
    ok: true,
    data: Object.keys(stored).length > 0 ? stored : null,
  };
}

// ---------------------------------------------------------------------
// Shared field helpers
// ---------------------------------------------------------------------

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters.`)
    .transform((value) => value || null);

const optionalNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .transform((value, ctx) => {
      if (!value) {
        return null;
      }
      const number = Number(value);
      if (!Number.isFinite(number) || number < min || number > max) {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
      return number;
    });

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

/**
 * Photo URLs come from the browser upload (PhotoUploadField), so the
 * server only accepts public URLs inside the owner's own storage folder --
 * an owner can't point their listing at an arbitrary external image.
 */
export function parsePhotoUrl(
  raw: string,
  allowedPrefix: string,
): ParseResult<string | null> {
  const url = raw.trim();
  if (!url) {
    return { ok: true, data: null };
  }
  if (!url.startsWith(allowedPrefix) || url.includes("..")) {
    return {
      ok: false,
      error: "That photo couldn't be used. Please upload it again.",
    };
  }
  return { ok: true, data: url };
}

// ---------------------------------------------------------------------
// Restaurant
// ---------------------------------------------------------------------

export const PRICE_RANGES = ["$", "$$", "$$$"] as const;

const restaurantSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Restaurant name is required.")
      .max(120, "Restaurant name must be at most 120 characters."),
    area: z
      .string()
      .trim()
      .min(1, "Area is required, for example Nugegoda or Colombo 03.")
      .max(80, "Area must be at most 80 characters."),
    address: optionalText(200, "Address"),
    price_range: z
      .string()
      .refine(
        (value) => value === "" || (PRICE_RANGES as readonly string[]).includes(value),
        "Choose a price range.",
      )
      .transform((value) => value || null),
    latitude: optionalNumber(-90, 90, "Latitude must be a number between -90 and 90."),
    longitude: optionalNumber(-180, 180, "Longitude must be a number between -180 and 180."),
    cuisine_type: z
      .string()
      .transform((value) =>
        value
          .split(",")
          .map((cuisine) => cuisine.trim())
          .filter(Boolean),
      )
      .refine((list) => list.length <= 6, "List at most 6 cuisines.")
      .refine(
        (list) => list.every((cuisine) => cuisine.length <= 40),
        "Each cuisine must be at most 40 characters.",
      )
      .transform((list) => (list.length > 0 ? list : null)),
    vibe_description: optionalText(1000, "Vibe description"),
    is_published: z.boolean(),
  })
  .refine((value) => (value.latitude === null) === (value.longitude === null), {
    message: "Enter both latitude and longitude, or leave both empty.",
  });

export type RestaurantFormData = z.output<typeof restaurantSchema> & {
  opening_hours: Record<string, string> | null;
  cover_photo_url: string | null;
};

export function parseRestaurantForm(
  formData: FormData,
  photoUrlPrefix: string,
): ParseResult<RestaurantFormData> {
  const parsed = restaurantSchema.safeParse({
    name: field(formData, "name"),
    area: field(formData, "area"),
    address: field(formData, "address"),
    price_range: field(formData, "price_range"),
    latitude: field(formData, "latitude"),
    longitude: field(formData, "longitude"),
    cuisine_type: field(formData, "cuisine_type"),
    vibe_description: field(formData, "vibe_description"),
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  const hours = parseOpeningHours(formData);
  if (!hours.ok) {
    return hours;
  }

  const photo = parsePhotoUrl(field(formData, "cover_photo_url"), photoUrlPrefix);
  if (!photo.ok) {
    return photo;
  }

  return {
    ok: true,
    data: {
      ...parsed.data,
      opening_hours: hours.data,
      cover_photo_url: photo.data,
    },
  };
}

// ---------------------------------------------------------------------
// Menu item
// ---------------------------------------------------------------------

export const SUGGESTED_MENU_CATEGORIES = [
  "Mains",
  "Short eats",
  "Rice & curry",
  "Kottu",
  "Beverages",
  "Desserts",
] as const;

const menuItemSchema = z.object({
  item_name: z
    .string()
    .trim()
    .min(1, "Item name is required.")
    .max(120, "Item name must be at most 120 characters."),
  description: optionalText(500, "Description"),
  // LKR, whole rupees or cents; generous upper bound just to catch typos.
  price: optionalNumber(0, 1_000_000, "Price must be an amount in rupees, e.g. 1250."),
  category: optionalText(40, "Category"),
});

export type MenuItemFormData = z.output<typeof menuItemSchema> & {
  photo_url: string | null;
};

export function parseMenuItemForm(
  formData: FormData,
  photoUrlPrefix: string,
): ParseResult<MenuItemFormData> {
  const parsed = menuItemSchema.safeParse({
    item_name: field(formData, "item_name"),
    description: field(formData, "description"),
    price: field(formData, "price"),
    category: field(formData, "category"),
  });
  if (!parsed.success) {
    return { ok: false, error: firstIssue(parsed.error) };
  }

  const photo = parsePhotoUrl(field(formData, "photo_url"), photoUrlPrefix);
  if (!photo.ok) {
    return photo;
  }

  return { ok: true, data: { ...parsed.data, photo_url: photo.data } };
}
