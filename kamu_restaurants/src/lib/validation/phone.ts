/**
 * Normalizes a phone number typed by an owner ("077 123 4567",
 * "+94 (77) 123-4567") to digits with an optional leading "+", or returns
 * null if it can't be a real number. Kamu's admins use it to call the
 * restaurant when verifying the account, so it only needs to be dialable,
 * not E.164-perfect.
 */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) {
    return null;
  }

  return trimmed.startsWith("+") ? `+${digits}` : digits;
}
