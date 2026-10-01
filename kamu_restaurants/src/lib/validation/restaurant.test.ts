import { describe, expect, it } from "vitest";
import {
  hoursFromStored,
  parseMenuItemForm,
  parseOpeningHours,
  parsePhotoUrl,
  parseRestaurantForm,
} from "./restaurant";

const PREFIX =
  "https://example.supabase.co/storage/v1/object/public/restaurant-photos/owners/owner-1/";

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

const validRestaurant = {
  name: "  Ceylon Leaf Cafe ",
  area: "Colombo 03",
  address: "",
  price_range: "$$",
  latitude: "",
  longitude: "",
  cuisine_type: "Cafe, Sri Lankan, ",
  vibe_description: "Quiet garden cafe",
  is_published: "on",
};

describe("parseRestaurantForm", () => {
  it("parses and normalizes a valid form", () => {
    const result = parseRestaurantForm(form(validRestaurant), PREFIX);

    expect(result).toEqual({
      ok: true,
      data: {
        name: "Ceylon Leaf Cafe",
        area: "Colombo 03",
        address: null,
        price_range: "$$",
        latitude: null,
        longitude: null,
        cuisine_type: ["Cafe", "Sri Lankan"],
        vibe_description: "Quiet garden cafe",
        is_published: true,
        opening_hours: null,
        cover_photo_url: null,
      },
    });
  });

  it("treats a missing publish checkbox as unpublished", () => {
    const unchecked = Object.fromEntries(
      Object.entries(validRestaurant).filter(([key]) => key !== "is_published"),
    );
    const result = parseRestaurantForm(form(unchecked), PREFIX);
    expect(result.ok && result.data.is_published).toBe(false);
  });

  it.each([
    ["name", { name: "  " }, "Restaurant name is required."],
    ["area", { area: "" }, "Area is required"],
    ["price range", { price_range: "$$$$" }, "Choose a price range."],
    ["latitude range", { latitude: "123", longitude: "79.8" }, "Latitude must be"],
    ["only one coordinate", { latitude: "6.9", longitude: "" }, "both latitude and longitude"],
    ["too many cuisines", { cuisine_type: "a,b,c,d,e,f,g" }, "at most 6 cuisines"],
    ["long vibe", { vibe_description: "x".repeat(1001) }, "at most 1000 characters"],
  ])("rejects a bad %s", (_label, override, message) => {
    const result = parseRestaurantForm(form({ ...validRestaurant, ...override }), PREFIX);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(message);
  });

  it("parses coordinates as numbers", () => {
    const result = parseRestaurantForm(
      form({ ...validRestaurant, latitude: "6.9101", longitude: "79.8571" }),
      PREFIX,
    );
    expect(result.ok && [result.data.latitude, result.data.longitude]).toEqual([
      6.9101, 79.8571,
    ]);
  });

  it("accepts a cover photo from the owner's own folder only", () => {
    const own = parseRestaurantForm(
      form({ ...validRestaurant, cover_photo_url: `${PREFIX}abc.jpg` }),
      PREFIX,
    );
    expect(own.ok && own.data.cover_photo_url).toBe(`${PREFIX}abc.jpg`);

    const external = parseRestaurantForm(
      form({ ...validRestaurant, cover_photo_url: "https://evil.example/x.jpg" }),
      PREFIX,
    );
    expect(external.ok).toBe(false);
  });
});

describe("parsePhotoUrl", () => {
  it("rejects path traversal out of the owner's folder", () => {
    expect(parsePhotoUrl(`${PREFIX}../owner-2/x.jpg`, PREFIX).ok).toBe(false);
  });

  it("maps empty to null", () => {
    expect(parsePhotoUrl("  ", PREFIX)).toEqual({ ok: true, data: null });
  });
});

describe("opening hours", () => {
  it("round-trips the stored format used by the seed data", () => {
    const stored = { mon: "7:30-19:00", sat: "8:00-20:00", sun: "Closed" };
    const week = hoursFromStored(stored);

    expect(week.mon).toEqual({ open: "07:30", close: "19:00", closed: false });
    expect(week.sun).toEqual({ open: "", close: "", closed: true });
    expect(week.tue).toEqual({ open: "", close: "", closed: false });

    const formData = new FormData();
    for (const [day, hours] of Object.entries(week)) {
      formData.set(`hours.${day}.open`, hours.open);
      formData.set(`hours.${day}.close`, hours.close);
      if (hours.closed) formData.set(`hours.${day}.closed`, "on");
    }

    expect(parseOpeningHours(formData)).toEqual({ ok: true, data: stored });
  });

  it("blanks out text it can't parse instead of failing", () => {
    expect(hoursFromStored({ mon: "ask at the counter" }).mon).toEqual({
      open: "",
      close: "",
      closed: false,
    });
  });

  it("allows overnight ranges", () => {
    const result = parseOpeningHours(
      form({ "hours.fri.open": "18:00", "hours.fri.close": "02:00" }),
    );
    expect(result).toEqual({ ok: true, data: { fri: "18:00-2:00" } });
  });

  it("returns null when no day is filled in", () => {
    expect(parseOpeningHours(new FormData())).toEqual({ ok: true, data: null });
  });

  it.each([
    ["half-filled day", { "hours.mon.open": "08:00" }, "Monday: enter both"],
    ["same open and close", { "hours.tue.open": "08:00", "hours.tue.close": "08:00" }, "Tuesday"],
    ["malformed time", { "hours.wed.open": "8am", "hours.wed.close": "17:00" }, "Wednesday"],
  ])("rejects a %s", (_label, fields, message) => {
    const result = parseOpeningHours(form(fields));
    expect(!result.ok && result.error).toContain(message);
  });
});

describe("parseMenuItemForm", () => {
  it("parses a valid item", () => {
    expect(
      parseMenuItemForm(
        form({ item_name: "Kottu", description: "", price: "1250", category: "Mains" }),
        PREFIX,
      ),
    ).toEqual({
      ok: true,
      data: {
        item_name: "Kottu",
        description: null,
        price: 1250,
        category: "Mains",
        photo_url: null,
      },
    });
  });

  it.each([
    ["missing name", { item_name: "" }, "Item name is required."],
    ["negative price", { item_name: "Tea", price: "-5" }, "Price must be"],
    ["non-numeric price", { item_name: "Tea", price: "free" }, "Price must be"],
  ])("rejects a %s", (_label, fields, message) => {
    const result = parseMenuItemForm(form(fields), PREFIX);
    expect(!result.ok && result.error).toContain(message);
  });
});
