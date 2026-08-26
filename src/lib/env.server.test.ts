import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// env.server.ts imports "server-only", which unconditionally throws outside
// Next's bundler ("react-server" export condition). Stub it out so the
// module can be imported directly under Vitest/Node.
vi.mock("server-only", () => ({}));

const ORIGINAL_ENV = { ...process.env };

async function importServerEnv() {
  const mod = await import("./env.server");
  return mod.serverEnv;
}

describe("serverEnv", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it("parses a valid service role key", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "sb_secret_test";

    const serverEnv = await importServerEnv();

    expect(serverEnv.SUPABASE_SERVICE_ROLE_KEY).toBe("sb_secret_test");
  });

  it("throws a clear error when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    await expect(importServerEnv()).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it("throws a clear error when SUPABASE_SERVICE_ROLE_KEY is empty", async () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";

    await expect(importServerEnv()).rejects.toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
