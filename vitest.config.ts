import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests.
 *
 * `node` rather than `jsdom` by default. Almost everything worth testing here
 * without a browser is server-side — a byte parser, a schema, a mapping from a
 * validated form value to a column — and a DOM around those is a slower start
 * for no benefit. A component test that needs one sets it per file with a
 * `// @vitest-environment jsdom` comment.
 *
 * `src/**` only, so the Playwright specs under `e2e/` are never picked up by
 * the wrong runner — they need a server and a browser, and vitest would
 * collect and fail them.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
