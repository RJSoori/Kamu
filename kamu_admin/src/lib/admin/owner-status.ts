export const OWNER_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type OwnerStatus = (typeof OWNER_STATUSES)[number];
