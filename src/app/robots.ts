import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getSeoDefaults } from "@/lib/queries/seo";

/**
 * robots.txt, driven by the same `site_noindex` switch as the meta tags.
 *
 * Two layers say the same thing on purpose. The meta tag stops a page that has
 * already been fetched from being indexed; this stops it being fetched at all.
 * Turning the site live is one boolean in the admin, and both follow.
 *
 * `/admin` and `/portal` are disallowed regardless. Neither is crawlable
 * anyway — both sit behind auth — but saying so keeps them out of the logs and
 * out of any accidental public index.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const defaults = await getSeoDefaults();

  if (defaults?.site_noindex) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/api/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
