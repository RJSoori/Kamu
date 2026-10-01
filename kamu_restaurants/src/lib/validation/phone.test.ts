import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["0771234567", "0771234567"],
    ["077 123 4567", "0771234567"],
    ["+94 77 123 4567", "+94771234567"],
    ["+94 (77) 123-4567", "+94771234567"],
    [" 011 2 345 678 ", "0112345678"],
  ])("normalizes %j", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    ["empty", ""],
    ["too short", "12345"],
    ["too long", "+1234567890123456"],
    ["letters", "077 CALL ME"],
    ["plus in the middle", "077+1234567"],
  ])("rejects %s", (_label, input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});
