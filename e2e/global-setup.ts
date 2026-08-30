import { ADMIN_ROUTES, MISSING_SLUGS, PUBLIC_ROUTES, SERVICE_ROUTES } from "./routes";

/**
 * Ask for every route once, before any browser opens.
 *
 * The Next dev server compiles a route the first time it is requested, and the
 * first request to an uncompiled one can take tens of seconds. That is fine —
 * it is what a dev server is — but it made the suite lie: a browser asking for
 * a cold route gets its document while the response is still streaming, so an
 * assertion about a `<meta>` tag could time out on a page that was, seconds
 * later, perfectly correct. Seventeen tests failed that way on the first run
 * and every one of them passed against a warm server.
 *
 * A flaky suite is worse than no suite, because its green means nothing and
 * its red gets ignored. So the compile is paid for here, once, in plain
 * fetches rather than in browsers: nothing is asserted, the response is read
 * to completion and thrown away, and the only thing that matters is that the
 * server has done the work before a test looks at it.
 *
 * Sequential on purpose. Compiling twenty routes at once on a laptop is how
 * the dev server becomes the slowest part of the run.
 */
async function globalSetup() {
  const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3000";

  const routes = [
    ...PUBLIC_ROUTES.map((route) => route.path),
    ...SERVICE_ROUTES,
    ...ADMIN_ROUTES,
    "/robots.txt",
    "/sitemap.xml",
    // A 404 is a route too, and the first one is compiled on demand as well.
    "/this-page-does-not-exist",
    ...MISSING_SLUGS,
  ];

  const started = Date.now();

  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route}`, {
        redirect: "manual",
        // Long enough for a cold compile of the heaviest page, short enough
        // that a genuinely hung server does not stall the whole run.
        signal: AbortSignal.timeout(120_000),
      });
      // Read it to the end: a streamed response is not finished being
      // rendered until it has been consumed.
      await response.arrayBuffer();
    } catch {
      /*
        Swallowed deliberately.

        This is a warm-up, not a check. A route that cannot be fetched here is
        a route whose own spec is about to fail with a message that says what
        was actually wrong — which is far more useful than this loop throwing
        and taking the entire suite down before a single test has run.
      */
    }
  }

  const seconds = Math.round((Date.now() - started) / 1000);
  console.log(`[e2e] warmed ${routes.length} routes in ${seconds}s`);
}

export default globalSetup;
