// Builds the Facts (_shared/listing.ts) for listing-assist and listing-coach:
// the form's current values, plus the saved menu and reviews when the
// restaurant already exists. Reads run as the owner, so RLS applies.
import type { Facts } from "./listing.ts";
import type { OwnerCaller } from "./owner.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Facts, or an error message when the restaurant isn't the caller's. */
export async function loadFacts(
  owner: OwnerCaller,
  // deno-lint-ignore no-explicit-any
  body: any,
): Promise<{ facts: Facts; restaurantId: string | null } | { error: string }> {
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  const form = body?.form ?? {};
  const facts: Facts = {
    listing: {
      name: text(form.name, 120),
      area: text(form.area, 80),
      cuisine: text(form.cuisine_type, 300).split(",").map((c) => c.trim()).filter(Boolean).slice(0, 6),
      price: ["$", "$$", "$$$"].includes(form.price_range) ? form.price_range : null,
    },
    menu: [],
    reviews: [],
    description: text(body?.description, 1000),
  };

  const restaurantId = body?.restaurant_id ? String(body.restaurant_id) : null;
  if (!restaurantId) return { facts, restaurantId };
  if (!UUID.test(restaurantId)) return { error: "Unknown restaurant" };

  const { data: canEdit } = await owner.caller.rpc("can_edit_restaurant", { rid: restaurantId });
  if (!canEdit) return { error: "Not your restaurant" };

  const [menu, reviews] = await Promise.all([
    owner.caller
      .from("menu_items")
      .select("item_name, description, price, category")
      .eq("restaurant_id", restaurantId)
      .limit(40),
    owner.caller
      .from("reviews")
      .select("rating, review_text")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(15),
  ]);
  facts.menu = menu.data ?? [];
  facts.reviews = reviews.data ?? [];
  return { facts, restaurantId };
}
