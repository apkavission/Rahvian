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

      /*
        `server-only` is a guard for the bundler, not a fact about the code.

        The package exports a module that throws the moment a Client Component
        imports it — which is exactly what it is for, and it makes any file that
        imports it untestable here: vitest is neither bundler, so it takes the
        client entry point and the whole suite fails at collection with "This
        module cannot be imported from a Client Component".

        Stubbed with an empty module. Nothing is weakened: the real check runs
        in `next build`, where it belongs, and stubbing it is what lets the
        email layout — server-only, and the most breakable HTML in the estate —
        have tests at all.
      */
      "server-only": resolve(__dirname, "src/test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    /* Public environment variables, so a module that validates them at import
       time can be loaded. See `src/test/env.ts`. */
    setupFiles: ["src/test/env.ts"],
  },
});
