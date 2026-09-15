import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedControlClient } from "@/lib/supabase/control";
import type { PublicDemoRow } from "@/types/control";

/**
 * The demos, as a visitor may see them.
 *
 * ---------------------------------------------------------------------------
 * **Read live from the estate, not typed into the CMS.** Six demos carrying
 * nineteen invented businesses already exist as rows, in six schemas, with
 * their names, industries and taglines maintained in their own panels. Copying
 * any of that onto the company website by hand would mean a portfolio that is
 * wrong the first time somebody renames a business — and the owner asked for
 * the opposite: *"ye dynamic karna"*.
 *
 * So this reads `control.public_demos()`, which returns the businesses that
 * have been switched to **Open to anybody** on `/admin/estate/demos` and
 * nothing else. Opening one to the world is a decision made in the panel, by a
 * person, on the screen that has always owned it. This function cannot widen
 * it: there is no argument to pass.
 *
 * ---------------------------------------------------------------------------
 * **Cached with a tag, like every other public read here.** The shop window
 * changes when somebody flips a switch, which is rarely; a page that asked six
 * schemas on every request would pay for that on every visit instead.
 */

/** One demo business, as a card on the company website needs it. */
export interface PublicDemo {
  appKey: string;
  appName: string;
  baseUrl: string;
  slug: string;
  name: string;
  businessName: string;
  industryLabel: string;
  tagline: string | null;
  description: string | null;
  /** Where a visitor lands when they click it. */
  href: string;
}

/** Every business inside one demo, which is what a card on the site is. */
export interface PublicDemoApp {
  key: string;
  name: string;
  baseUrl: string;
  /** The businesses, in the order the demo itself lists them. */
  businesses: PublicDemo[];
}

/**
 * Every public demo business, flat, in estate order.
 *
 * An error is a reason to show nothing rather than to take the page down: a
 * demo grid that cannot reach the estate renders its empty copy, and the rest
 * of the page is still worth serving.
 */
export const getPublicDemos = unstable_cache(
  async (): Promise<PublicDemo[]> => {
    const supabase = createCachedControlClient();

    const { data, error } = await supabase.rpc("public_demos");

    if (error) {
      console.error("[demos] could not read the estate:", error.message);
      return [];
    }

    return ((data ?? []) as PublicDemoRow[]).map((row) => ({
      appKey: row.app_key,
      appName: row.app_name,
      baseUrl: row.base_url,
      slug: row.slug,
      name: row.name,
      businessName: row.business_name,
      industryLabel: row.industry_label,
      tagline: row.tagline,
      description: row.description,

      /*
        The demo's own address, not a route on this site.

        `base_url` is where that application answers — a port in development, a
        domain in production — and it is a column so the day a demo moves, it
        moves here too without a deployment of this site.
      */
      href: `${row.base_url.replace(/\/$/, "")}/${row.slug}`,
    }));
  },
  ["public-demos"],
  { tags: [CACHE_TAGS.demos], revalidate: 300 },
);

/**
 * The same, grouped into the six demos they belong to.
 *
 * A card per *demo* rather than per business, because "a clinic site" is the
 * thing a prospect is deciding about — the three clinics inside it are the
 * proof that one codebase becomes three businesses, which is the argument the
 * card makes and the switcher inside the demo then demonstrates.
 */
export async function getPublicDemoApps(): Promise<PublicDemoApp[]> {
  const demos = await getPublicDemos();
  const apps = new Map<string, PublicDemoApp>();

  for (const demo of demos) {
    const existing = apps.get(demo.appKey);

    if (existing) {
      existing.businesses.push(demo);
      continue;
    }

    apps.set(demo.appKey, {
      key: demo.appKey,
      name: demo.appName,
      baseUrl: demo.baseUrl,
      businesses: [demo],
    });
  }

  return [...apps.values()];
}
