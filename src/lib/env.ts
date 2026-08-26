import { z } from "zod";

/**
 * Public, client-safe environment variables.
 *
 * Safe to import from anywhere (browser or server): Next.js's compiler
 * statically inlines `process.env.NEXT_PUBLIC_*` references at build time,
 * including ones that live inside a shared module like this one.
 *
 * Parsed eagerly so a missing/malformed value fails fast at boot/build with
 * a clear error, instead of surfacing later as a confusing runtime failure.
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
