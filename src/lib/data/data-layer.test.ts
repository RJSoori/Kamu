import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MenuItemInput } from "./menu-items";
import type { RestaurantInput } from "./restaurants";

vi.mock("server-only", () => ({}));

// One chainable, awaitable query-builder mock shared by every test (same
// idea as kamu/src/lib/data/restaurants.test.ts). Every builder method
// records its call and returns the builder; awaiting the chain -- or calling
// single()/maybeSingle() -- resolves to `mocks.result`.
const mocks = vi.hoisted(() => {
  const state = {
    calls: [] as Array<[string, unknown[]]>,
    result: { data: null as unknown, error: null as unknown },
    invoke: null as unknown as ReturnType<typeof vi.fn>,
  };
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "eq", "not", "order", "insert", "update", "delete"]) {
    builder[method] = (...args: unknown[]) => {
      state.calls.push([method, args]);
      return builder;
    };
  }
  builder.single = async () => state.result;
  builder.maybeSingle = async () => state.result;
  builder.then = (
    resolve: (value: unknown) => unknown,
    reject: (reason: unknown) => unknown,
  ) => Promise.resolve(state.result).then(resolve, reject);
  return { state, builder };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => {
      mocks.state.calls.push(["from", [table]]);
      return mocks.builder;
    },
    functions: { invoke: mocks.state.invoke },
  })),
}));

const restaurants = await import("./restaurants");
const R1 = "11111111-1111-4111-8111-111111111111";
const M1 = "22222222-2222-4222-8222-222222222222";
const menuItems = await import("./menu-items");

function callsTo(method: string): unknown[][] {
  return mocks.state.calls
    .filter(([name]) => name === method)
    .map(([, args]) => args);
}

beforeEach(() => {
  mocks.state.calls = [];
  mocks.state.result = { data: null, error: null };
  mocks.state.invoke = vi.fn(async () => ({ data: { ok: true }, error: null }));
});

describe("restaurants data layer", () => {
  it("only lists the owner's own restaurants", async () => {
    mocks.state.result = { data: [{ id: "r1" }], error: null };

    const list = await restaurants.getMyRestaurants("owner-1");

    expect(list).toEqual([{ id: "r1" }]);
    expect(callsTo("eq")).toContainEqual(["owner_id", "owner-1"]);
  });

  it("returns an empty list when data is null", async () => {
    expect(await restaurants.getMyRestaurants("owner-1")).toEqual([]);
  });

  it("throws the Supabase error message", async () => {
    mocks.state.result = { data: null, error: { message: "db unreachable" } };
    await expect(restaurants.getMyRestaurants("owner-1")).rejects.toThrow(
      "db unreachable",
    );
  });

  it("scopes a single fetch by id AND owner", async () => {
    await restaurants.getMyRestaurant("owner-1", R1);
    expect(callsTo("eq")).toEqual([
      ["id", R1],
      ["owner_id", "owner-1"],
    ]);
  });

  it("treats a malformed id from the URL as not found, without querying", async () => {
    expect(await restaurants.getMyRestaurant("owner-1", "not-a-uuid")).toBeNull();
    expect(callsTo("from")).toEqual([]);
  });

  it("always creates restaurants owned by the given owner", async () => {
    mocks.state.result = { data: { id: "r1" }, error: null };

    await restaurants.createRestaurant("owner-1", {
      name: "Cafe",
    } as RestaurantInput);

    expect(callsTo("insert")[0][0]).toMatchObject({
      name: "Cafe",
      owner_id: "owner-1",
    });
  });

  it("scopes updates by id AND owner", async () => {
    mocks.state.result = { data: { id: "r1" }, error: null };

    await restaurants.updateRestaurant("owner-1", R1, {
      name: "Cafe",
    } as RestaurantInput);

    expect(callsTo("eq")).toEqual([
      ["id", R1],
      ["owner_id", "owner-1"],
    ]);
  });

  it("de-duplicates and sorts known areas", async () => {
    mocks.state.result = {
      data: [{ area: "Nugegoda" }, { area: "Colombo 03" }, { area: "Nugegoda" }],
      error: null,
    };
    expect(await restaurants.getKnownAreas()).toEqual(["Colombo 03", "Nugegoda"]);
  });

  it("checks for an existing embedding without fetching the vector", async () => {
    mocks.state.result = { data: { id: R1 }, error: null };
    expect(await restaurants.hasMoodSearchEmbedding(R1)).toBe(true);
    expect(callsTo("select")).toEqual([["id"]]);
    expect(callsTo("not")).toEqual([["vibe_embedding", "is", null]]);

    mocks.state.result = { data: null, error: null };
    expect(await restaurants.hasMoodSearchEmbedding(R1)).toBe(false);
  });

  it("asks embed-restaurant to refresh the mood-search embedding", async () => {
    expect(await restaurants.refreshMoodSearchEmbedding("r1")).toBe(true);
    expect(mocks.state.invoke).toHaveBeenCalledWith("embed-restaurant", {
      body: { restaurant_id: "r1" },
    });
  });

  it("reports (rather than throws) an embedding failure", async () => {
    mocks.state.invoke = vi.fn(async () => ({
      data: null,
      error: { message: "function not found" },
    }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await restaurants.refreshMoodSearchEmbedding("r1")).toBe(false);
  });
});

describe("menu items data layer", () => {
  it("pins every write to the restaurant", async () => {
    await menuItems.createMenuItem(R1, { item_name: "Kottu" } as MenuItemInput);
    expect(callsTo("insert")[0][0]).toMatchObject({
      item_name: "Kottu",
      restaurant_id: R1,
    });

    await menuItems.updateMenuItem(R1, M1, { item_name: "Kottu" } as MenuItemInput);
    await menuItems.deleteMenuItem(R1, M1);
    expect(callsTo("eq")).toEqual([
      ["id", M1],
      ["restaurant_id", R1],
      ["id", M1],
      ["restaurant_id", R1],
    ]);
  });

  it("throws the Supabase error message on a failed write", async () => {
    mocks.state.result = { data: null, error: { message: "row-level security" } };
    await expect(menuItems.deleteMenuItem(R1, M1)).rejects.toThrow(
      "row-level security",
    );
  });
});
