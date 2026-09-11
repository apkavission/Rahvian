import type { Metadata } from "next";
import { getSeoDefaults } from "@/lib/queries/seo";
import { SITE_URL } from "@/lib/env";
import { applyTitleTemplate } from "@/lib/validation/seo";

interface PageSeo {
  /** Page-specific title. Passed through the admin's title template. */
  title?: string | null;
  description?: string | null;
  /** Absolute path, e.g. `/services/web-development`. */
  path: string;
  keywords?: string[] | null;
  /** Absolute URL of a page-specific social image. */
  image?: string | null;
  /** Set by the row's own `noindex` column. */
  noindex?: boolean;
  canonical?: string | null;
  /**
   * Whether to run `title` through the admin's title template. The home page
   * opts out — its title already names the company, and templating it would
   * produce "Rahvian … | Rahvian".
   */
  templated?: boolean;
}

/**
 * Build a route's `Metadata` from the admin-controlled defaults.
 *
 * Every public route goes through this rather than writing its own tags, for
 * two reasons. The title template, the fallback description and the crawl
 * switch live in `seo_defaults` and are editable — a route that hardcodes them
 * silently opts out of that. And `site_noindex` has to be able to override
 * every page at once during the pre-launch period; that only works if there is
 * one place where robots directives are decided.
 *
 * The template is applied here rather than through Next's `title.template`,
 * because the template string itself is database content and the root layout
 * would have to know it at module scope.
 */
export async function buildMetadata(page: PageSeo): Promise<Metadata> {
  const defaults = await getSeoDefaults();

  const title = page.title
    ? page.templated === false
      ? page.title
      : applyTitleTemplate(defaults?.title_template, page.title)
    : (defaults?.default_title ?? "Rahvian");

  const description = page.description || defaults?.default_description || undefined;
  const url = `${SITE_URL}${page.path}`;
  const canonical = page.canonical || url;

  // A page marked noindex stays noindex. The site-wide switch can add that but
  // never remove it — un-indexing is a deliberate choice per page.
  const noindex = page.noindex || defaults?.site_noindex || false;

  /*
    Present only when the page names its own image.

    Next merges the `opengraph-image` file convention into a route's metadata,
    but an explicit `openGraph.images` key suppresses that merge — and a key set
    to `undefined` still counts as explicit. Spreading conditionally is what
    lets the generated card apply everywhere a page has no image of its own.
  */
  const imageOverride = page.image
    ? { images: [{ url: page.image }] }
    : undefined;

  return {
    title,
    description,
    keywords: page.keywords?.length ? page.keywords : undefined,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: "website",
      siteName: "Rahvian",
      title,
      description,
      url,
      locale: "en_IN",
      ...imageOverride,
    },
    twitter: {
      // Every route resolves to a 1200×630 card — its own where one exists,
      // the root `opengraph-image` otherwise — so the large card is always
      // the right claim.
      card: "summary_large_image",
      title,
      description,
      ...(page.image ? { images: [page.image] } : {}),
    },
    verification: {
      google: defaults?.google_verification ?? undefined,
      other: defaults?.bing_verification
        ? { "msvalidate.01": defaults.bing_verification }
        : undefined,
    },
  };
}

/*
  The template itself is applied by `applyTitleTemplate` in
  `lib/validation/seo.ts`, beside the rule that requires the `%s` in it. The
  admin's search-result preview calls the same function, so what the owner is
  shown and what is rendered cannot drift apart.
*/
