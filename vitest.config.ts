import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Auth and throttle tests share module-level state (the in-memory fallback
    // map, the cached env). One file per process keeps them honest.
    pool: "forks",
    poolOptions: { forks: { singleFork: false } },
  },
});
