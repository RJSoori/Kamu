import { env } from "@/lib/env";

/**
 * Owner photo uploads go straight from the browser to Supabase Storage
 * (src/components/owner/PhotoUploadField.tsx) -- Next's server actions cap
 * request bodies at 1 MB, too small for phone photos. These limits mirror
 * the restaurant-photos bucket settings and the owners/<uid>/ storage
 * policies in ../kamu/supabase/migrations/20261001120000_owner_verification_and_reports.sql.
 */
export const PHOTO_BUCKET = "restaurant-photos";
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ownerPhotoFolder(ownerId: string): string {
  return `owners/${ownerId}`;
}

/** Public URLs the server accepts for this owner's cover/menu photos. */
export function ownerPhotoUrlPrefix(ownerId: string): string {
  return `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${ownerPhotoFolder(ownerId)}/`;
}
