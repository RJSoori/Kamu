import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OwnerStatus } from "@/lib/admin/owner-status";

const mockEq = vi.fn();
const mockUpdate = vi.fn(() => ({ eq: mockEq }));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin/guard", () => ({
  requireAdmin: vi.fn(async () => ({
    supabase: { from: vi.fn(() => ({ update: mockUpdate })) },
  })),
}));

const { setOwnerStatusAction } = await import("./actions");

function form(note: string) {
  const data = new FormData();
  data.set("status_note", note);
  return data;
}

describe("setOwnerStatusAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
  });

  it("refuses to reject or suspend without a note for the owner", async () => {
    await expect(setOwnerStatusAction("o1", "rejected", form("  "))).rejects.toThrow(/note/);
    await expect(setOwnerStatusAction("o1", "suspended", form(""))).rejects.toThrow(/note/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("clears any old note on approve", async () => {
    await setOwnerStatusAction("o1", "approved", form("left over from a rejection"));
    expect(mockUpdate).toHaveBeenCalledWith({ status: "approved", status_note: null });
    expect(mockEq).toHaveBeenCalledWith("id", "o1");
  });

  it("saves the trimmed note on reject", async () => {
    await setOwnerStatusAction("o1", "rejected", form("  Couldn't verify the shop.  "));
    expect(mockUpdate).toHaveBeenCalledWith({
      status: "rejected",
      status_note: "Couldn't verify the shop.",
    });
  });

  it("refuses an unknown status", async () => {
    await expect(
      setOwnerStatusAction("o1", "deleted" as OwnerStatus, form("x")),
    ).rejects.toThrow(/Unknown status/);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("surfaces a database error instead of pretending it worked", async () => {
    mockEq.mockResolvedValue({ error: { message: "permission denied" } });
    await expect(setOwnerStatusAction("o1", "approved", form(""))).rejects.toThrow(
      "permission denied",
    );
  });
});
