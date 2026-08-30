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

type Cached = { slugs: Set<string>; at: number };

const cache = new Map<string, Cached>();

/** In flight, so twenty requests arriving together make one fetch. */
const inFlight = new Map<string, Promise<Set<string> | null>>();

async function fetchSlugs(
  table: string,
  publishedOnly: boolean,
  url: string,
  key: string,
): Promise<Set<string> | null> {
  const query = new URLSearchParams({ select: "slug" });
  // The anonymous key is used, so RLS already hides drafts on the tables that
  // have a status. The filter is belt and braces for the ones that do not.
  if (publishedOnly) query.set("status", "eq.published");

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
  const source = SOURCES.find((candidate) => pathname.startsWith(candidate.prefix));
  if (!source) return true;

  const slug = pathname.slice(source.prefix.length);

  // A trailing slash, or a deeper path. Neither is a record address, and
  // neither is this function's business.
  if (!slug || slug.includes("/")) return true;

  const cached = cache.get(source.table);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.slugs.has(decodeURIComponent(slug));
  }

  let pending = inFlight.get(source.table);

  if (!pending) {
    pending = fetchSlugs(source.table, source.publishedOnly, supabaseUrl, anonKey)
      .catch(() => null)
      .finally(() => inFlight.delete(source.table));
    inFlight.set(source.table, pending);
  }

  const slugs = await pending;

  // Fail open, and keep serving a stale list rather than nothing: an expired
  // list is a far better answer than no answer, because the only thing at
  // stake is whether a *missing* page says 404 or 200.
  if (!slugs) return cached ? cached.slugs.has(decodeURIComponent(slug)) : true;

  cache.set(source.table, { slugs, at: Date.now() });

  return slugs.has(decodeURIComponent(slug));
}

/** The prefixes this polices, exported so a test can assert the set. */
export const POLICED_PREFIXES = SOURCES.map((source) => source.prefix);
