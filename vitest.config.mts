import { defineConfig } from "vitest/config";

export default defineConfig({
  // Resolves the "@/..." path alias from tsconfig.json natively (this used
  // to need the vite-tsconfig-paths plugin).
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
  },
});
