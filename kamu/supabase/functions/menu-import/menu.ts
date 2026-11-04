// Menu import's plain-code half: the JSON shape Gemini must reply in, the
// clean-up of what it sends, and the comparison with the saved menu. No
// Deno APIs, so menu.test.ts runs under Node.

/** Gemini structured output: it can only reply in this shape. */
export const MENU_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_menu: { type: "BOOLEAN" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          item_name: { type: "STRING" },
          description: { type: "STRING", nullable: true },
          price: { type: "NUMBER", nullable: true },
          category: { type: "STRING", nullable: true },
        },
        required: ["item_name"],
      },
    },
  },
  required: ["is_menu", "items"],
};

export interface ReadItem {
  item_name: string;
  description: string | null;
  price: number | null;
  category: string | null;
}

export type ImportedItem = ReadItem & (
  | { status: "new" }
  | { status: "price_change" | "unchanged"; existing_id: string; old_price: number | null }
);

const MAX_ITEMS = 80;

/**
 * Gemini's reply checked like user input, with the same limits as the
 * owner's menu form (name 120, description 500, category 40, price
 * 0-1,000,000). Items without a name are dropped; a bad price becomes null.
 */
export function cleanItems(raw: unknown): ReadItem[] {
  const items = (raw as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];

  const text = (value: unknown, max: number) =>
    typeof value === "string" && value.trim() ? value.trim().slice(0, max) : null;

  return items.slice(0, MAX_ITEMS).flatMap((item) => {
    const name = text(item?.item_name, 120);
    if (!name) return [];
    const price = typeof item.price === "number" && item.price >= 0 && item.price <= 1_000_000
      ? item.price
      : null;
    return [{
      item_name: name,
      description: text(item.description, 500),
      price,
      category: text(item.category, 40),
    }];
  });
}

/** "Chicken  Kottu!" and "chicken kottu" are the same dish. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/**
 * Labels each read item against the saved menu by name: new, a price
 * change (the photo shows a different price), or unchanged. Duplicates on
 * the photo keep only the first.
 */
export function compareWithMenu(
  read: ReadItem[],
  existing: { id: string; item_name: string; price: number | null }[],
): ImportedItem[] {
  const byName = new Map(existing.map((item) => [normalizeName(item.item_name), item]));
  const seen = new Set<string>();

  return read.flatMap((item): ImportedItem[] => {
    const key = normalizeName(item.item_name);
    if (seen.has(key)) return [];
    seen.add(key);

    const match = byName.get(key);
    if (!match) return [{ ...item, status: "new" }];
    const changed = item.price !== null && item.price !== match.price;
    return [{
      ...item,
      status: changed ? "price_change" : "unchanged",
      existing_id: match.id,
      old_price: match.price,
    }];
  });
}
