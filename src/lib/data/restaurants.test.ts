import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockOrder = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: mockOrder,
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
  })),
}));

const { getRestaurantById, getRestaurants } = await import("./restaurants");

describe("getRestaurants", () => {
  beforeEach(() => {
    mockOrder.mockReset();
  });

  it("returns restaurants on success", async () => {
    mockOrder.mockResolvedValueOnce({
      data: [{ id: "1", name: "Test Cafe", area: "Colombo" }],
      error: null,
    });

    const restaurants = await getRestaurants();

    expect(restaurants).toHaveLength(1);
    expect(restaurants[0].name).toBe("Test Cafe");
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
