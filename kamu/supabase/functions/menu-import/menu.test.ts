// node --experimental-strip-types --test supabase/functions/menu-import/menu.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanItems, compareWithMenu } from "./menu.ts";

test("cleanItems drops nameless items and fixes bad fields", () => {
  const items = cleanItems({
    items: [
      { item_name: "  Chicken Kottu ", price: 1200, category: "Kottu", description: "" },
      { item_name: "", price: 100 },
      { item_name: "Mystery", price: -5 },
      { item_name: "Typo", price: 99_999_999 },
      { item_name: "x".repeat(200), price: "1500" },
    ],
  });
  assert.deepEqual(items[0], { item_name: "Chicken Kottu", description: null, price: 1200, category: "Kottu" });
  assert.equal(items.length, 4);
  assert.equal(items[1].price, null);
  assert.equal(items[2].price, null);
  assert.equal(items[3].item_name.length, 120);
  assert.equal(items[3].price, null);
});

test("cleanItems survives junk", () => {
  assert.deepEqual(cleanItems(null), []);
  assert.deepEqual(cleanItems({ items: "nope" }), []);
});

test("compareWithMenu labels new, price changes and unchanged", () => {
  const existing = [
    { id: "a", item_name: "Chicken Kottu", price: 1200 },
    { id: "b", item_name: "Egg Roti", price: 300 },
  ];
  const read = [
    { item_name: "chicken  kottu!", description: null, price: 1350, category: null },
    { item_name: "Egg Roti", description: null, price: 300, category: null },
    { item_name: "Milo Shake", description: null, price: 450, category: null },
    { item_name: "Milo shake", description: null, price: 500, category: null },
    { item_name: "Egg roti", description: null, price: null, category: null },
  ];
  const result = compareWithMenu(read, existing);
  assert.deepEqual(result.map((r) => r.status), ["price_change", "unchanged", "new"]);
  assert.deepEqual(result[0], {
    item_name: "chicken  kottu!", description: null, price: 1350, category: null,
    status: "price_change", existing_id: "a", old_price: 1200,
  });
});
