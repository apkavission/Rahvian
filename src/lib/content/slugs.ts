/**
 * Which content addresses actually exist.
 *
 * This is the fix for the soft 404 in `docs/pre-production-cleanup.md` §1.1:
 * `/services/anything-made-up` rendered the not-found page and returned **200**,
 * because a route-level `loading.tsx` flushes the shell before the page reaches
 * `notFound()`, and a status cannot be changed once bytes have been sent.
 *
 * **The loader is not what moves** — that is a standing instruction. So the
 * check has to happen before the response starts, which means the proxy, which
 * means knowing the valid slugs there.
 *
 * Two things this is careful about, and the second matters more:
 *
 *   **It costs nothing on almost every request.** Only five path prefixes are
 *   ever looked at; everything else — the home page, `/pricing`, an asset —
 *   returns immediately without touching the network.
 *
 *   **It fails open.** If the lookup errors or times out, the request is let
 *   through. A momentary blip must never turn a real page into a 404: the
 *   failure this exists to prevent is a dead address answering 200, and the
 *   failure it must not create is a live one answering 404.
 */

/** How long a slug list is trusted before it is fetched again. */
const TTL_MS = 60_000;

/** Long enough for a cold database, short enough not to hold a page up. */
const TIMEOUT_MS = 2_000;

/**
 * The five addresses that render one row each.
 *
 * `blog/category` is listed before `blog` because the longest prefix has to
 * win: `/blog/category/x` is a category, not a post called "category".
 */
const SOURCES = [
  { prefix: "/blog/category/", table: "blog_categories", publishedOnly: false },
  { prefix: "/services/", table: "services", publishedOnly: true },
  { prefix: "/portfolio/", table: "projects", publishedOnly: true },
  { prefix: "/case-studies/", table: "case_studies", publishedOnly: true },
  { prefix: "/blog/", table: "blog_posts", publishedOnly: true },
] as const;

/**
 * The single-segment addresses this application routes for itself.
 *
 * ---------------------------------------------------------------------------
 * **Why a list, in a file that otherwise refuses to keep lists.**
 *
 * `(site)/[slug]` renders pages made in the admin, which means every
 * unrecognised address at the root now matches a route and reaches
 * `notFound()` — a soft 404, the exact thing this file exists to stop. The
 * check has to happen in the proxy, and the proxy has to be able to tell
 * `/pricing`, which is a folder in this repository, from `/pricng`, which is a
 * typo.
 *
 * The database cannot answer that. Every one of these except `products` and
 * `request-a-quote` has a row in `company.pages`, so "is it a page" lets two
 * real addresses 404. So the routes are named here — and the test beside this
 * file reads `src/app/(site)` and fails if the two ever disagree, which is
 * what makes a hand-written list safe to hand-write.
 *
 * `admin`, `api` and `media` are not `(site)` routes and are policed by
 * nothing here; they are listed so a signed-in person is never rewritten into
 * a 404 on the way to the panel.
 */
const ROOT_ROUTES = new Set([
  "about",
  "blog",
  "case-studies",
  "contact",
  "portfolio",
  "pricing",
  "privacy-policy",
  "products",
  "request-a-quote",
  "services",
  "terms-and-conditions",

  // Outside `(site)`, and none of this function's business.
  "admin",
  "api",
  "media",
]);

/** Exported so the test can compare it with the folders that exist. */
export const ROOT_ROUTE_NAMES = ROOT_ROUTES;

/**
 * Next's file-convention routes that render an image, with their build hash.
 *
 * `opengraph-image.tsx` serves `/opengraph-image-12o0cb`, not
 * `/opengraph-image` — the suffix is chosen at build time, so these can only
 * be recognised by shape.
 */
export const GENERATED_ROUTE =
  /^(opengraph-image|twitter-image|icon|apple-icon|manifest)(-[a-z0-9]+)?$/;

type Cached = { slugs: Set<string>; at: number };

const cache = new Map<string, Cached>();

/** In flight, so twenty requests arriving together make one fetch. */
const inFlight = new Map<string, Promise<Set<string> | null>>();

async function fetchSlugs(
  table: string,
  publishedOnly: boolean,
  url: string,
  key: string,
  /**
   * One more PostgREST filter, for the root-page lookup.
   *
   * That one asks for `is_system=eq.false`, because a system page is one this
   * repository routes for itself: `products-apka-saathi` is real at
   * `/products/apka-saathi` and must not also answer at `/products-apka-saathi`,
   * and `home` is the front page and must not answer at `/home`. Both are rows
   * in `pages`, so without this they would look like addresses.
   */
  extra?: [string, string],
): Promise<Set<string> | null> {
  const query = new URLSearchParams({ select: "slug" });
  // The anonymous key is used, so RLS already hides drafts on the tables that
  // have a status. The filter is belt and braces for the ones that do not.
  if (publishedOnly) query.set("status", "eq.published");
  if (extra) query.set(extra[0], extra[1]);

  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Accept-Profile": "company",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) return null;

  const rows = (await response.json()) as { slug?: unknown }[];

  return new Set(
    rows
      .map((row) => row.slug)
      .filter((slug): slug is string => typeof slug === "string"),
  );
}

/**
 * Does this path name a record that exists?
 *
 * `true` for anything this does not police, anything it cannot check, and
 * anything that is real. `false` only when the list was read successfully and
 * the slug is not in it.
 */
export async function contentExists(
  pathname: string,
  supabaseUrl: string,
  anonKey: string,
): Promise<boolean> {
  /*
    A single segment is either one of this application's own routes, a page
    somebody made in the admin, or nothing.

    Handled before the prefix table because it has no prefix: the address *is*
    the slug. Anything with a slash in it falls through to the five sources
    below, and anything that is neither is let through untouched.
  */
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 1) {
    const segment = decodeURIComponent(segments[0]);
    if (ROOT_ROUTES.has(segment)) return true;

    /*
      A dot means a file, and a file is not a page.

      `robots.txt`, `sitemap.xml` and `opengraph-image` are route handlers, not
      rows in `pages` — so policing them as slugs rewrote all three to the
      not-found page and served HTML where a crawler expected text. Found by
      the SEO suite on 2026-09-01, which is exactly the failure it exists for:
      `robots.txt` answering with a `<!DOCTYPE html>` is invisible to every
      other check and fatal to indexing.

      The proxy's matcher already excludes images and `_next`; it does not
      exclude every extension, and listing them here would be the same list
      kept in two places. A page slug is `^[a-z0-9-]+$` by the database's own
      check constraint and can never contain a dot, so the dot is the rule.
    */
    if (segment.includes(".")) return true;

    /*
      Next's generated image routes, which carry a build hash.

      `opengraph-image.tsx` does not serve `/opengraph-image`. It serves
      `/opengraph-image-12o0cb?40a3c8a67b4ac95f`, and the suffix changes with
      every build — so no list can name it and an exact match never will. The
      social card was policed as a page slug and answered with the not-found
      page in HTML, which is invisible to everything except somebody pasting a
      link into WhatsApp and seeing no picture.

      Matched by convention rather than by name, because that is what the
      convention is: a fixed prefix and a hash Next chooses.
    */
    if (GENERATED_ROUTE.test(segment)) return true;

    /*
      Only pages that have no route of their own.

      `is_system` marks the eleven that ship with the product and are folders
      in this repository. Their slugs are rows in `pages` too, so counting them
      as addresses would make `/home` answer beside `/`, and
      `/products-apka-saathi` answer beside `/products/apka-saathi` — two
      addresses for one page, competing in search results for the same words.
    */
    return await slugExists(
      "custom-pages",
      segment,
      supabaseUrl,
      anonKey,
      { table: "pages", publishedOnly: true, extra: ["is_system", "eq.false"] },
    );
  }

  const source = SOURCES.find((candidate) => pathname.startsWith(candidate.prefix));
  if (!source) return true;

  const slug = pathname.slice(source.prefix.length);

  // A trailing slash, or a deeper path. Neither is a record address, and
  // neither is this function's business.
  if (!slug || slug.includes("/")) return true;

  return await slugExists(source.table, decodeURIComponent(slug), supabaseUrl, anonKey, {
    table: source.table,
    publishedOnly: source.publishedOnly,
  });
}

/**
 * Is this slug in that table, according to a list we cache for a minute?
 *
 * Pulled out of `contentExists` when root-level pages started being policed
 * too, so both callers share one cache, one in-flight promise per table, and
 * one definition of failing open — rather than the second one growing its own
 * slightly different copy of all three.
 */
async function slugExists(
  /**
   * What to file the cached list under.
   *
   * Its own name rather than the table, because two lookups read `pages` with
   * different filters — every published page, and only the ones without a
   * route — and one cache entry for both would answer whichever question was
   * asked first.
   */
  cacheKey: string,
  slug: string,
  supabaseUrl: string,
  anonKey: string,
  from: { table: string; publishedOnly: boolean; extra?: [string, string] },
): Promise<boolean> {
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.slugs.has(slug);
  }

  let pending = inFlight.get(cacheKey);

  if (!pending) {
    pending = fetchSlugs(from.table, from.publishedOnly, supabaseUrl, anonKey, from.extra)
      .catch(() => null)
      .finally(() => inFlight.delete(cacheKey));
    inFlight.set(cacheKey, pending);
  }

  const slugs = await pending;

  // Fail open, and keep serving a stale list rather than nothing: an expired
  // list is a far better answer than no answer, because the only thing at
  // stake is whether a *missing* page says 404 or 200.
  if (!slugs) return cached ? cached.slugs.has(slug) : true;

  cache.set(cacheKey, { slugs, at: Date.now() });

  return slugs.has(slug);
}

/** The prefixes this polices, exported so a test can assert the set. */
export const POLICED_PREFIXES = SOURCES.map((source) => source.prefix);

/* ========================================================================== */

/**
 * Where a page in `company.pages` actually answers.
 *
 * ---------------------------------------------------------------------------
 * **A slug is not always an address, and assuming it is put a 404 in the
 * admin.** The Pages screen linked every row to `/<slug>`, which is right for
 * the pages the owner creates and wrong for the ones this repository routes
 * itself. `products-apka-saathi` is a row whose page lives at
 * `/products/apka-saathi`; `home` is a row whose page lives at `/`. Both were
 * offered as "Open on the site" and both went nowhere.
 *
 * ---------------------------------------------------------------------------
 * **Why this is a list rather than a rule.** There is no derivation that gets
 * `/products/apka-saathi` out of `products-apka-saathi` without guessing —
 * replacing the first hyphen with a slash happens to work for this one slug and
 * would break the moment a page called `case-studies` were made a system page.
 * The address of a system page is decided by a folder, so the only honest
 * source is a list that a test compares against those folders.
 *
 * Everything not named here is a page the owner made, and its slug is its
 * address. `is_system` is what separates the two, so the caller passes it.
 */
const SYSTEM_PATHS: Record<string, string> = {
  home: "/",
  "products-apka-saathi": "/products/apka-saathi",
};

/** Exported so a test can check every one of these folders exists. */
export const SYSTEM_PAGE_PATHS = SYSTEM_PATHS;

export function publicPathFor(page: { slug: string; is_system?: boolean | null }): string {
  const known = SYSTEM_PATHS[page.slug];

  if (known) return known;

  /*
    A system page with no entry above is a page whose folder somebody added
    without telling this list. `/<slug>` is the best guess and is usually right
    — `about`, `pricing`, `contact` all match — so it is returned rather than
    throwing. The test is what makes the mismatch visible.
  */
  return `/${page.slug}`;
}
