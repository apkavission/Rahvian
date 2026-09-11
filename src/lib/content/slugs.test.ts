import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENERATED_ROUTE,
  POLICED_PREFIXES,
  ROOT_ROUTE_NAMES,
  SYSTEM_PAGE_PATHS,
  publicPathFor,
} from "@/lib/content/slugs";

/**
 * The two lists in `slugs.ts` that have to match the routes that exist.
 *
 * ---------------------------------------------------------------------------
 * **Why these are tested against the filesystem rather than trusted.**
 *
 * `slugs.ts` is what stops a made-up address answering 200 with the not-found
 * page on it — a soft 404, which keeps a dead URL indexed and re-crawled for
 * months. It does that in the proxy, before any bytes are sent, because a
 * route-level `loading.tsx` flushes the shell long before the page reaches
 * `notFound()`.
 *
 * To do that it needs to know which single-segment addresses this application
 * routes for itself, and the database cannot answer that: `/products` and
 * `/request-a-quote` are folders here with no row in `company.pages`, so
 * "is it a page" would send two real addresses to a 404.
 *
 * So the list is written by hand, which is exactly the kind of thing that
 * rots. This is what stops it rotting: add a folder under `(site)` and forget
 * the list, and this fails here rather than on the live site.
 */

const SITE = join(process.cwd(), "src", "app", "(site)");

/**
 * Every address `(site)` serves, whether it is a folder or a file.
 *
 * The file half matters and was missed once: `opengraph-image.tsx` serves
 * `/opengraph-image` without being a directory, so a check that listed only
 * folders declared it "not a route", the proxy policed it as a page slug, and
 * the social card was served as the not-found page in HTML. Found by the SEO
 * suite rather than by this test, which is the wrong way round.
 */
function siteSegments(): string[] {
  const entries = readdirSync(SITE, { withFileTypes: true });

  const folders = entries
    .filter((entry) => entry.isDirectory())
    // `[slug]` is the catch-all that renders admin-made pages. It is the
    // reason this policing exists and is not itself an address.
    .filter((entry) => !entry.name.startsWith("["))
    .map((entry) => entry.name);

  /* Next's file conventions. `page`, `layout`, `loading`, `error` and
     `not-found` are not addresses of their own; anything else here is. */
  const NOT_ADDRESSES = new Set(["page", "layout", "loading", "error", "not-found", "template"]);

  const files = entries
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .map((entry) => entry.name.replace(/\.tsx?$/, ""))
    .filter((name) => !NOT_ADDRESSES.has(name));

  return [...folders, ...files];
}

describe("ROOT_ROUTE_NAMES", () => {
  it("covers every folder under (site)", () => {
    const missing = siteSegments().filter(
      (segment) => !ROOT_ROUTE_NAMES.has(segment) && !GENERATED_ROUTE.test(segment),
    );

    expect(
      missing,
      `These are routes but are not in ROOT_ROUTES, so the proxy will rewrite them ` +
        `to a 404: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("covers every route file, by name or by convention", () => {
    /*
      A route can be a file rather than a folder. `opengraph-image.tsx` is one,
      and it does not even serve its own name — Next serves it at
      `/opengraph-image-12o0cb`, with a hash chosen at build time. It was
      policed as a page slug and answered the social card with the not-found
      page in HTML, which nothing notices until a link is pasted somewhere and
      shows no picture.
    */
    const uncovered = siteSegments().filter(
      (segment) => !ROOT_ROUTE_NAMES.has(segment) && !GENERATED_ROUTE.test(segment),
    );

    expect(
      uncovered,
      `These are routes and nothing lets them through: ${uncovered.join(", ")}`,
    ).toEqual([]);
  });

  it("recognises a generated image route with its build hash", () => {
    expect(GENERATED_ROUTE.test("opengraph-image")).toBe(true);
    expect(GENERATED_ROUTE.test("opengraph-image-12o0cb")).toBe(true);
    expect(GENERATED_ROUTE.test("twitter-image-9ab3")).toBe(true);

    // And does not swallow a real page slug that merely starts similarly.
    expect(GENERATED_ROUTE.test("icons-for-designers")).toBe(false);
    expect(GENERATED_ROUTE.test("opengraph-image-guide-for-clients")).toBe(false);
  });

  it("names no folder that has stopped existing", () => {
    const segments = new Set(siteSegments());

    // Not `(site)` routes at all, and listed only so the proxy leaves them
    // alone. They have no folder here and are expected to be absent.
    const elsewhere = new Set(["admin", "api", "media"]);

    const stale = [...ROOT_ROUTE_NAMES].filter(
      (name) => !segments.has(name) && !elsewhere.has(name),
    );

    expect(
      stale,
      `These are in ROOT_ROUTES but are no longer routes, so a page could be ` +
        `made at that address and never render: ${stale.join(", ")}`,
    ).toEqual([]);
  });

  it("does not claim the address the proxy rewrites misses to", () => {
    // `/__not-found/__` is two segments precisely so that `(site)/[slug]`
    // cannot match it. If it ever becomes one segment, or a route appears that
    // matches it, the rewrite starts rendering instead of missing and every
    // soft 404 comes back.
    expect(ROOT_ROUTE_NAMES.has("__not-found")).toBe(false);
    expect(siteSegments()).not.toContain("__not-found");
  });
});

describe("POLICED_PREFIXES", () => {
  it("puts the longer prefix first where one contains another", () => {
    /*
      `/blog/category/x` is a category, not a post called "category". The
      lookup takes the *first* prefix that matches, so a shorter prefix listed
      before a longer one it contains swallows every address the longer one
      was for. Order is behaviour here, not tidiness.
    */
    for (const [i, earlier] of POLICED_PREFIXES.entries()) {
      for (const later of POLICED_PREFIXES.slice(i + 1)) {
        expect(
          later.startsWith(earlier),
          `"${earlier}" is listed before "${later}", which it contains — ` +
            `so "${later}" can never match. Put the longer prefix first.`,
        ).toBe(false);
      }
    }
  });

  it("polices a route that exists for each prefix", () => {
    const segments = new Set(siteSegments());

    for (const prefix of POLICED_PREFIXES) {
      const first = prefix.split("/").filter(Boolean)[0];
      expect(segments.has(first), `${prefix} is policed but /${first} is not a route.`).toBe(
        true,
      );
    }
  });
});

describe("publicPathFor", () => {
  /*
    The bug this exists for: the admin's Pages screen offered "Open on the site"
    for every row and built the address as `/<slug>`. For a row whose page is a
    folder somewhere else, that link went to a 404 — in the admin, on a page
    that was published and perfectly fine. Found by opening every screen in a
    browser, which no suite had ever done.

    The example it was found on was `products-apka-saathi`, a row whose page sat
    at `/products/apka-saathi`. That product was removed on 2026-09-11, so
    `home` is the only mapping left — which makes the case below the one that
    still has to hold: a slug is not an address.
  */
  it("sends a page the owner made to its own slug", () => {
    expect(publicPathFor({ slug: "our-story" })).toBe("/our-story");
  });

  it("sends the front page to the front page", () => {
    expect(publicPathFor({ slug: "home" })).toBe("/");
  });

  it("sends a page this repository routes itself to where the folder is", () => {
    /* Not a real row: the mapping is exercised through the exported table so
       this keeps testing the mechanism now that only `home` is mapped. */
    expect(publicPathFor({ slug: "home", is_system: true })).toBe("/");
    expect(Object.keys(SYSTEM_PAGE_PATHS)).toContain("home");
  });

  it("every address it names is a real folder", () => {
    for (const [slug, path] of Object.entries(SYSTEM_PAGE_PATHS)) {
      if (path === "/") continue;

      const folder = resolve(SITE, path.replace(/^\//, ""));

      expect(
        existsSync(folder),
        `${slug} is mapped to ${path}, and there is no page at ${folder}`,
      ).toBe(true);
    }
  });
});
