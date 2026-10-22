import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

const FALLBACK = "/fallback";

describe("safeRedirectPath", () => {
  it.each([
    ["/dashboard", "/dashboard"],
    ["/dashboard/restaurants/abc?tab=menu", "/dashboard/restaurants/abc?tab=menu"],
    ["/dashboard#hours", "/dashboard#hours"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(expected);
  });

  it.each([
    ["protocol-relative URL", "//evil.com"],
    ["backslash trick", "/\\evil.com"],
    ["backslash-slash trick", "/\\/evil.com"],
    ["tab-smuggled slashes", "/\t/evil.com"],
    ["absolute http URL", "http://evil.com/dashboard"],
    ["absolute https URL", "https://evil.com"],
    ["javascript: URL", "javascript:alert(1)"],
    ["data: URL", "data:text/html,<script>alert(1)</script>"],
  ])("rejects %s", (_label, input) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(FALLBACK);
  });

  it("keeps an encoded backslash as an inert same-origin path", () => {
    // ?next=/%5Cevil.com arrives here already decoded to "/\evil.com" (covered
    // above); a still-encoded one must stay a harmless local path.
    expect(safeRedirectPath("/%5Cevil.com", FALLBACK)).toBe("/%5Cevil.com");
  });

  it.each([null, undefined, ""])("falls back for %s", (input) => {
    expect(safeRedirectPath(input, FALLBACK)).toBe(FALLBACK);
  });
});
