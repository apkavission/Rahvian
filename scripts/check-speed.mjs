import { chromium } from "@playwright/test";

/**
 * What "fast" actually is, measured rather than asserted.
 *
 * ---------------------------------------------------------------------------
 * **Run it against `npm run build && npm run start`, never against `dev`.**
 *
 * The dev server serves unminified bundles with the hot-reload client attached:
 * it reports 925 KB of JavaScript where the real build ships 225 KB. Measuring
 * the wrong one produces either false alarm or false comfort, and both waste a
 * day.
 *
 * ---------------------------------------------------------------------------
 * **Throttled, because the answer on a fibre-connected laptop is meaningless.**
 *
 * Roughly a good 4G connection with the processor slowed four times over —
 * which is a mid-range phone, which is how most of these pages are actually
 * read. `check:weight` answers how much is sent; this answers how long somebody
 * waits.
 */
const ROUTES = ["/", "/services", "/pricing", "/contact", "/blog"];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });

/* Roughly a good 4G connection: 1.6 Mbps down, 150ms of latency. */
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("Network.emulateNetworkConditions", {
  offline: false,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
  latency: 150,
});
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

console.log("  route                 TTFB    first paint   largest paint   settled");
console.log("  " + "-".repeat(70));

for (const route of ROUTES) {
  await page.goto("http://localhost:3000" + route, { waitUntil: "load" });

  const t = await page.evaluate(async () => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const fp = paints.find((p) => p.name === "first-contentful-paint");

    const lcp = await new Promise((resolve) => {
      let last = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) last = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      setTimeout(() => resolve(last), 900);
    });

    return {
      ttfb: Math.round(nav.responseStart),
      fcp: Math.round(fp?.startTime ?? 0),
      lcp: Math.round(lcp),
      load: Math.round(nav.loadEventEnd),
    };
  });

  console.log(
    `  ${route.padEnd(20)} ${String(t.ttfb + "ms").padStart(6)}  ${String(t.fcp + "ms").padStart(11)}  ${String(t.lcp + "ms").padStart(13)}  ${String(t.load + "ms").padStart(8)}`,
  );
}

console.log("\n  Throttled to 4G with the processor slowed four times over.");
console.log("  Google calls a largest paint under 2500ms good, under 4000ms needs work.\n");

await browser.close();
