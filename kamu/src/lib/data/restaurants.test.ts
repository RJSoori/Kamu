import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A single chainable query-builder mock shared by every test. `select`,
// `eq`, and `contains` all return the same builder object so any
// combination the data layer calls them in (e.g. select().order(),
// select().eq().order(), select().eq().contains().order(),
// select().eq().maybeSingle()) resolves to the same terminal mocks.
// `order`/`maybeSingle` are plain vi.fn()s configured per test.
const mockOrder = vi.fn();
const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();
const mockContains = vi.fn();
const mockSelect = vi.fn();

const queryBuilder = {
  eq: mockEq,
  contains: mockContains,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
};

mockSelect.mockReturnValue(queryBuilder);
mockEq.mockReturnValue(queryBuilder);
mockContains.mockReturnValue(queryBuilder);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: mockSelect,
    })),
  })),
}));

const { getRestaurantById, getRestaurants, getRestaurantFilterOptions } =
  await import("./restaurants");

describe("getRestaurants", () => {
  beforeEach(() => {
    mockOrder.mockReset();
    mockEq.mockClear();
    mockContains.mockClear();
  });

  it("returns restaurants on success", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [{ id: "1", name: "Test Cafe", area: "Colombo" }],
      error: null,
    });

    const restaurants = await getRestaurants();

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].name).toBe("Test Cafe");
    expect(mockEq).not.toHaveBeenCalled();
    expect(mockContains).not.toHaveBeenCalled();
  });

  it("returns an empty array when data is null", async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    const restaurants = await getRestaurants();

    expect(restaurants).toEqual([]);
  });

  it("throws with the Supabase error message on failure", async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: "db unreachable" },
    });

    await expect(getRestaurants()).rejects.toThrow("db unreachable");
  });

  it("filters by area when provided", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    await getRestaurants({ area: "Nugegoda" });

    expect(mockEq).toHaveBeenCalledWith("area", "Nugegoda");
    expect(mockContains).not.toHaveBeenCalled();
  });

  it("filters by cuisine when provided", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    await getRestaurants({ cuisine: "Cafe" });

    expect(mockContains).toHaveBeenCalledWith("cuisine_type", ["Cafe"]);
    expect(mockEq).not.toHaveBeenCalled();
  });

  it("applies both filters together", async () => {
    mockOrder.mockResolvedValueOnce({ data: [], error: null });

    await getRestaurants({ area: "Nugegoda", cuisine: "Cafe" });

    expect(mockEq).toHaveBeenCalledWith("area", "Nugegoda");
    expect(mockContains).toHaveBeenCalledWith("cuisine_type", ["Cafe"]);
  });
});

describe("getRestaurantById", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
  });

  it("returns null when no restaurant matches", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const restaurant = await getRestaurantById("missing-id");

    expect(restaurant).toBeNull();
  });

  it("throws with the Supabase error message on failure", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    });

    await expect(getRestaurantById("some-id")).rejects.toThrow("not found");
  });
});

describe("getRestaurantFilterOptions", () => {
  beforeEach(() => {
    mockOrder.mockReset();
  });

  it("returns sorted, de-duplicated areas and cuisines", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [
        { area: "Nugegoda", cuisine_type: ["Cafe", "Sri Lankan"] },
        { area: "Colombo 03", cuisine_type: ["Cafe"] },
        { area: "Nugegoda", cuisine_type: ["Bakery"] },
      ],
      error: null,
    });

    const options = await getRestaurantFilterOptions();

    expect(options.areas).toEqual(["Colombo 03", "Nugegoda"]);
    expect(options.cuisines).toEqual(["Bakery", "Cafe", "Sri Lankan"]);
  });

  it("returns empty lists when data is null", async () => {
    mockOrder.mockResolvedValueOnce({ data: null, error: null });

    const options = await getRestaurantFilterOptions();

    expect(options).toEqual({ areas: [], cuisines: [] });
  });

  it("throws with the Supabase error message on failure", async () => {
    mockOrder.mockResolvedValueOnce({
      data: null,
      error: { message: "db unreachable" },
    });

    await expect(getRestaurantFilterOptions()).rejects.toThrow(
      "db unreachable",
    );
  });
});
