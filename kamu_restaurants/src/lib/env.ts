import { z } from "zod";

/**
 * Public, client-safe environment variables. Mirrors kamu/src/lib/env.ts.
 *
 * Parsed eagerly so a missing/malformed value fails fast at boot/build
 * instead of surfacing later as a confusing runtime failure. No server-only
 * env.server.ts here (yet) -- unlike kamu's admin panel, this app has no
 * identified need for a service-role client that bypasses RLS; everything
 * goes through the session-bound client and the ownership RLS policies in
 * ../kamu/supabase/migrations/20260911120000_restaurant_owners.sql.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
});

function parsePublicEnv() {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid environment variables. Check .env.local against .env.example:\n${issues}`,
    );
  }

  return parsed.data;
}

export const env = parsePublicEnv();
