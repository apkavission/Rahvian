#!/usr/bin/env node
/**
 * What a visitor actually downloads, per public page.
 *
 *   npm run build && npm run start     # in one terminal
 *   npm run check:weight               # in another
 *
 * Ground rule 5 is "Lighthouse mobile 90+, desktop 95+ on every public page",
 * and until now **nothing measured it**. This does not run Lighthouse — that
 * needs a headless Chrome harness and a stable machine to mean anything — but
 * it measures the input that ruins the score most often and most silently: how
 * much JavaScript the page ships.
 *
 * **Against a production build, never the dev server.** Dev chunks are
 * unminified and carry the whole HMR runtime, so a budget measured there is a
 * number about the dev server. That is why this is a script rather than part of
 * `npm run test:e2e`, which starts `next dev`.
 *
 * **Wire bytes, not decoded bytes.** What a phone on a slow connection pays for
 * is the compressed transfer, so that is what is budgeted. Decoded size is
 * printed beside it because that is what the browser has to parse, and parsing
 * is the half that costs a slow device its time rather than its data.
 */

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * The budgets, in KB over the wire.
 *
 * Set with headroom above what the site does today rather than at today's
 * number: a budget that fails on the next honest addition is a budget somebody
 * raises without looking. These are meant to catch a *step change* — a
 * dependency landing in the initial bundle, a dynamic import quietly becoming a
 * static one — not ordinary drift.
 */
const BUDGET = {
  /** Initial JavaScript, before anything lazy is fetched. */
  js: 350,
  /** Everything the page needs to render: HTML, CSS, fonts, images, scripts. */
  total: 700,
};

/**
 * The pages worth measuring.
 *
 * `/` and `/services` carry a 3D scene; the rest do not. Both kinds are here on
 * purpose — the point is that they should weigh **the same** at first load,
 * because three.js is behind a dynamic import and must not be in it.
 */
const ROUTES = [
  "/",
  "/about",
  "/services",
  "/services/web-development",
  "/portfolio",
  "/case-studies",
  "/blog",
  "/pricing",
  "/contact",
  "/request-a-quote",
  "/privacy-policy",
  "/terms-and-conditions",
];

const kb = (bytes) => Math.round(bytes / 1024);

async function main() {
  const { chromium } = await import("@playwright/test");

  const browser = await chromium.launch();
  const failures = [];

  console.log(`Measuring ${BASE} at 390px, initial load only.\n`);
  console.log(
    "route".padEnd(32) +
      "js".padStart(8) +
      "total".padStart(9) +
      "  (decoded js)".padStart(15),
  );
  console.log("-".repeat(64));

  for (const route of ROUTES) {
    // A phone-sized viewport, because that is the budget that binds.
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    const sizing = [];
    let js = 0;
    let total = 0;
    let decoded = 0;

    page.on("response", (response) => {
      sizing.push(
        (async () => {
          const sizes = await response.request().sizes().catch(() => null);
          if (!sizes) return;

          total += sizes.responseBodySize;

          if (response.request().resourceType() === "script") {
            js += sizes.responseBodySize;
            // Best effort. A response already consumed by the browser cannot
            // be read back, and an undercount here is only ever cosmetic.
            const body = await response.body().catch(() => null);
            if (body) decoded += body.length;
          }
        })(),
      );
    });

    try {
      // `load`, not `networkidle`: what is fetched *after* the page is usable
      // is the lazily-loaded scene, and keeping it out of this number is the
      // whole point of measuring here.
      await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60_000 });
      await Promise.all(sizing);
    } catch (error) {
      console.log(`${route.padEnd(32)}  could not be loaded: ${error.message.split("\n")[0]}`);
      failures.push(`${route} did not load`);
      await page.close();
      continue;
    }

    const overJs = kb(js) > BUDGET.js;
    const overTotal = kb(total) > BUDGET.total;

    console.log(
      route.padEnd(32) +
        `${kb(js)}${overJs ? "!" : " "}`.padStart(8) +
        `${kb(total)}${overTotal ? "!" : " "}`.padStart(9) +
        `${kb(decoded)}`.padStart(15),
    );

    if (overJs) failures.push(`${route}: ${kb(js)} KB of JavaScript, budget ${BUDGET.js}`);
    if (overTotal) failures.push(`${route}: ${kb(total)} KB in total, budget ${BUDGET.total}`);

    await page.close();
  }

  await browser.close();

  console.log(`\nBudget: ${BUDGET.js} KB JavaScript, ${BUDGET.total} KB total. Wire bytes, at 390px.`);

  if (failures.length > 0) {
    console.error(`\nOver budget:\n  ${failures.join("\n  ")}`);
    console.error(
      "\nA step change here is usually one of two things: a dependency that " +
        "landed in the initial bundle, or a dynamic import that quietly became " +
        "a static one.",
    );
    process.exit(1);
  }

  console.log("Every page within budget.");
}

main().catch((error) => {
  console.error("\nCould not measure:", error.message);
  console.error("Is a production server running? npm run build && npm run start");
  process.exit(1);
});
