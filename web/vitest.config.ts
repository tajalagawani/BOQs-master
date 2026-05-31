// IOX test runner config. Run with: npx vitest (or `npm test` once script added).
// Unit tests: pure-function tests, no DB, no network. Fast.
// Integration tests: hit a running dev server at TEST_BASE_URL (default localhost:3000).
//   Run only when `INTEGRATION=1` is set, so unit tests stay fast in normal `vitest`.
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include:
      process.env.INTEGRATION === "1"
        ? ["tests/integration/**/*.test.ts"]
        : ["tests/unit/**/*.test.ts"],
    reporters: ["default", "junit"],
    outputFile: { junit: "./tests/.last-junit.xml" },
    testTimeout: process.env.INTEGRATION === "1" ? 30_000 : 5_000,
  },
});
