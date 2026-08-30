import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./routes";

/**
 * The crawl switch says the same thing in all three places.
 *
 * `site_noindex` is one boolean on the SEO screen, and three things follow it:
 * the meta tag on every page, `robots.txt`, and the sitemap. The failure worth
 * catching is not "the site is closed" or "the site is open" — either is a
 * legitimate state, and which one is correct changes on launch day. It is the
 * three of them **disagreeing**: a robots.txt that allows crawling while every
 * page says noindex is a site nobody can find and nobody can diagnose.
 *
 * So these specs read the current state and assert consistency with it, rather
 * than asserting a value that would have to be edited the day the site goes
 * live.
 */

async function siteIsOpen(request: {
  get: (url: string) => Promise<{ text: () => Promise<string> }>;
}): Promise<boolean> {
  const robots = await (await request.get("/robots.txt")).text();
  return !/^\s*Disallow:\s*\/\s*$/m.test(robots);
}

test("robots.txt, the sitemap and the meta tags agree", async ({ request, page }) => {
  const open = await siteIsOpen(request);

  const robots = await (await request.get("/robots.txt")).text();
  const sitemap = await (await request.get("/sitemap.xml")).text();

  await page.goto("/pricing");
  const meta = await page
    .locator('head meta[name="robots"]')
    .getAttribute("content");

  if (open) {
    expect(robots, "robots.txt should name the sitemap once crawling is allowed").toContain(
      "Sitemap:",
    );
    expect(sitemap, "an open site's sitemap should list its pages").toContain("<loc>");
    expect(meta ?? "index").toMatch(/index/);
    expect(meta ?? "").not.toMatch(/noindex/);
  } else {
    expect(robots).toMatch(/Disallow:\s*\//);
    expect(sitemap, "a closed site's sitemap should list nothing").not.toContain("<loc>");
    expect(meta ?? "").toMatch(/noindex/);
  }
});

test("the sitemap is well-formed either way", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();

  expect(sitemap).toContain("<urlset");
  expect(sitemap).toContain("</urlset>");
});

test("every page has a canonical address, and it is absolute", async ({ page }) => {
  // A relative canonical is ignored, and a missing one lets a page be indexed
  // under whichever address happened to be crawled — including one carrying
  // campaign parameters.
  for (const route of PUBLIC_ROUTES.slice(0, 6)) {
    await page.goto(route.path);

    const canonical = page.locator('head link[rel="canonical"]');
    await expect(canonical, `${route.path} should declare a canonical`).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /^https?:\/\//);
  }
});

test("the home page carries the company's structured data once", async ({ page }) => {
  await page.goto("/");

  const blocks = page.locator('script[type="application/ld+json"]');
  const count = await blocks.count();
  expect(count).toBeGreaterThan(0);

  const graphs = await blocks.allTextContents();
  const types = graphs.flatMap((graph) => {
    const parsed = JSON.parse(graph) as { "@type"?: string } | { "@type"?: string }[];
    return (Array.isArray(parsed) ? parsed : [parsed]).map((node) => node["@type"]);
  });

  // Exactly one Organization node. Two would give search engines two answers
  // to "who is this company", and the other graphs reference this one by id.
  expect(types.filter((type) => type === "Organization")).toHaveLength(1);
});

test("the social card is a real image", async ({ page, request }) => {
  await page.goto("/");

  const url = await page.locator('head meta[property="og:image"]').getAttribute("content");
  expect(url, "the home page should name a social image").toBeTruthy();

  const response = await request.get(url!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image");
});

test("a page showing FAQs declares them, and one without them declares none", async ({
  page,
}) => {
  /*
    The `FAQPage` graph moved into the FAQ section itself on 2026-08-28. Before
    that it was emitted per route and only `/pricing` had ever been wired up, so
    the home page and the contact page showed questions and told search engines
    about none of them.

    What this pins is the property that made the move worth it: the graph
    follows the section. Any page the owner adds an FAQ to gets one, any page
    they remove it from loses it, and nobody edits a route either way.
  */
  const faqPages = ["/", "/pricing", "/contact"];

  for (const path of faqPages) {
    await page.goto(path);

    const graphs = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = graphs
      .map((graph) => JSON.parse(graph) as { "@type"?: string; mainEntity?: unknown[] })
      .filter((node) => node["@type"] === "FAQPage");

    // Exactly one. Two would be the old per-route emission left in place
    // beside the new one, which is the mistake this move could have made.
    expect(faq, `${path} should declare its FAQs exactly once`).toHaveLength(1);
    expect(faq[0].mainEntity?.length ?? 0).toBeGreaterThan(0);

    /*
      And the questions it claims are the questions on the page.

      This is the assertion that actually matters. A rich result promising
      answers the page does not show is the kind of mismatch a manual review
      penalises, and it is invisible unless something compares the two.
    */
    const first = (faq[0].mainEntity as { name: string }[])[0].name;
    await expect(
      page.getByText(first, { exact: false }).first(),
      `${path} claims "${first}" but does not show it`,
    ).toBeVisible();
  }

  // A page with no FAQ section declares none, rather than an empty graph.
  await page.goto("/about");
  const aboutGraphs = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(
    aboutGraphs.filter((graph) => graph.includes("FAQPage")),
    "/about has no FAQ section and should declare no FAQPage",
  ).toHaveLength(0);
});
