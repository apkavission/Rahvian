import { defineConfig, devices } from "@playwright/test";

/*
  `.env.local`, for the sign-in credentials and nothing else.

  Next loads it for the application; Playwright does not, so the setup project
  would find `ADMIN_EMAIL` unset and skip every signed-in spec on a machine
  where it is perfectly well configured. `process.loadEnvFile` is Node's own,
  so this needs no dependency and no parser of ours.

  Wrapped, because a machine without the file is a legitimate state: the public
  specs need nothing from it, and the signed-in ones skip themselves with a
  message that says why.
*/
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local. The signed-in specs will skip and say so.
}

/**
 * The browser harness.
 *
 * [testing.md](docs/testing.md) has carried a click-through list since the
 * first admin screen was built, and the rule the owner set is that it is
 * written as each screen lands and **run in one pass at the end**. This config
 * is what makes that pass repeatable rather than a one-off crawl by somebody
 * with a checklist and a good memory.
 *
 * What is here today is the half that needs no password: the public site, and
 * the guard on every admin route. The admin click-through itself is written
 * down but not automated — it needs a signed-in session, and the test account's
 * password is not in `.env.local` by design. `e2e/README.md` says what to do
 * when it arrives.
 *
 * `npm run test:e2e` was a script with nothing behind it until 2026-08-28,
 * exactly as `npm test` was before `vitest.config.ts` — a command that fails
 * loudly is better than one that passes by finding nothing, and both are now
 * real.
 */

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/** Kept in step with `e2e/routes.ts`, which the specs import it from. */
const STORAGE_STATE = "e2e/.auth/owner.json";

/**
 * The specs that need a session, named once.
 *
 * ---------------------------------------------------------------------------
 * **This was two lists, and they drifted the day they were written.**
 *
 * The `admin` project matched these by name and the `public` project listed the
 * same files to ignore. Nothing made the second list follow the first, so every
 * spec added to `admin` also ran signed out — where it opened the login screen,
 * found none of the things it was looking for, and failed. Three specs were in
 * that state (`pagination`, `staff-designation` and, the day it landed,
 * `demo-access`): seven red tests that said nothing about the application and
 * everything about this file.
 *
 * One expression, used by both, so adding a signed-in spec is one edit.
 */
const SIGNED_IN =
  /(admin-screens|staff-designation|pagination|demo-access|studio|responsive-admin)\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",

  /*
    Every route is requested once before any browser opens.

    The dev server compiles a route the first time it is asked for, and a
    browser that arrives during that compile can be handed a document while it
    is still streaming — which failed seventeen assertions on the first run of
    this suite, every one of them against a page that was correct seconds
    later. Paying the compile up front, in plain fetches, is what makes the
    result mean something. See `e2e/global-setup.ts`.
  */
  globalSetup: "./e2e/global-setup.ts",

  /*
    The dev server rather than a production build.

    `next build` takes minutes and prerenders every page against the live
    database, which is the right thing for a deploy and the wrong thing for a
    test run somebody is waiting on. What these specs assert — a heading, a
    status code, whether anything scrolls sideways — is identical in both.

    An already-running server is reused, so a session that has one open does
    not start a second on a port that is taken.
  */
  webServer: {
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    // A cold Next.js dev server compiles the first route on demand.
    timeout: 180_000,
    stdout: "ignore",
    stderr: "pipe",
  },

  use: {
    baseURL: BASE_URL,
    // Kept only for a failure. A trace per passing test is hundreds of
    // megabytes of something nobody opens.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  /*
    Three projects, and the split is about sessions rather than browsers.

    `public` runs signed out — the whole public site, and the assertion that
    every admin address turns into the login screen. It must not carry a
    session, or that last one would pass by never being true.

    `setup` signs in once and saves the cookie. `admin` depends on it and reuses
    it, so sixteen screens are opened without sixteen sign-ins.

    One browser throughout. These specs assert structure and layout, not engine
    differences, and three browsers would triple the run to say the same thing
    three times. A second is worth adding the day a rendering bug is found in
    one.
  */
  projects: [
    {
      name: "public",
      use: { ...devices["Desktop Chrome"] },
      /* The same expression the admin project matches, so the two cannot
         disagree. See SIGNED_IN above. */
      testIgnore: [SIGNED_IN, "**/auth.setup.ts"],
    },
    {
      name: "setup",
      use: { ...devices["Desktop Chrome"] },
      testMatch: "**/auth.setup.ts",
    },
    {
      name: "admin",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      testMatch: SIGNED_IN,
      dependencies: ["setup"],
    },
  ],

  // A dev server compiles a route the first time it is asked for, and the
  // first request to a cold one is slow enough to fail a default timeout.
  timeout: 60_000,
  expect: { timeout: 15_000 },

  reporter: [["list"]],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),

  /*
    One retry, and it is for a known, measured flake rather than a shrug.

    Inside a full run — two hundred tests, many workers, a dev server serving
    them all — an input dispatch occasionally never resolves. It has happened on
    a pointer click and on a keyboard press, on two unrelated controls, roughly
    once in fifteen. It has never reproduced in isolation: 24 sequential clicks
    clean, 16 parallel clean, and clean again while the dev server compiled
    thirteen cold routes. Four explanations were tested and ruled out — view
    transitions, a WebGL render loop, parallelism alone, and cold compilation —
    and it is written up in docs/testing.md.

    So: **a test that fails twice is a real failure.** A retry that hides a
    reproducible fault would be worse than the flake, which is why this is one
    retry and not three, and why the reason is written here rather than left as
    a number somebody raises when the suite goes red.
  */
  retries: 1,
});
