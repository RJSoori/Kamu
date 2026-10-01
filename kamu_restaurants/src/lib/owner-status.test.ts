import { describe, expect, it } from "vitest";
import { canOwnerEdit, listingState } from "./owner-status";

describe("canOwnerEdit", () => {
  it.each([
    ["pending", true],
    ["approved", true],
    ["rejected", false],
    ["suspended", false],
  ] as const)("%s -> %s", (status, expected) => {
    expect(canOwnerEdit(status)).toBe(expected);
  });
});

describe("listingState", () => {
  const published = { is_published: true, hidden_by_admin: false };

  it("is live only when published and the owner is approved", () => {
    expect(listingState(published, "approved")).toBe("live");
  });

  it("is awaiting verification when published by a pending owner", () => {
    expect(listingState(published, "pending")).toBe("awaiting_verification");
  });

  it.each(["rejected", "suspended"] as const)(
    "is offline when the owner is %s",
    (status) => {
      expect(listingState(published, status)).toBe("offline");
    },
  );

  it("is a draft when unpublished", () => {
    expect(
      listingState({ is_published: false, hidden_by_admin: false }, "approved"),
    ).toBe("draft");
  });

  it("reports an admin takedown above everything else", () => {
    expect(
      listingState({ is_published: false, hidden_by_admin: true }, "approved"),
    ).toBe("hidden_by_admin");
  });

  it("treats items without their own publish flag (menu items) as published", () => {
    expect(listingState({ hidden_by_admin: false }, "approved")).toBe("live");
  });
});
