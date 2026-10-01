import "server-only";
import { z } from "zod";

/**
 * Server-only secrets. The `server-only` import above makes any accidental
 * import of this module from a Client Component fail at BUILD time, not
 * just at runtime -- it's the guard that keeps the service-role key out of
 * the client bundle.
 *
 * Only import this from server-only code that genuinely needs the service
 * role key (currently just src/lib/supabase/admin.ts).
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required (see .env.example)"),
});

function parseServerEnv() {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid server environment variables. Check .env.local against .env.example:\n${issues}`,
    );
  }

  return parsed.data;
}

export const serverEnv = parseServerEnv();
