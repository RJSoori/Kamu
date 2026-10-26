/**
 * The `role` claim of a Bearer JWT, or null. Only a hint for an early 403:
 * the token's signature is checked by the database when the caller's token
 * is used for queries, so a forged claim gets no access there.
 */
export function jwtRole(authHeader: string): string | null {
  try {
    const payload = authHeader.replace(/^Bearer /, "").split(".")[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded).role ?? null;
  } catch {
    return null;
  }
}
