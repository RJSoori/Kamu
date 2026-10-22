import { env } from "@/lib/env";

// The customer site only renders images from our own Supabase Storage
// (images.remotePatterns in kamu/next.config.ts); anything else shows broken.
export const PHOTO_URL_PREFIX = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;

/** Returns the url (or null) if it's a Supabase Storage photo, else throws. */
export function checkPhotoUrl(url: string | null): string | null {
  if (url && !url.startsWith(PHOTO_URL_PREFIX)) {
    throw new Error(`Photo links must start with ${PHOTO_URL_PREFIX}`);
  }
  return url;
}
