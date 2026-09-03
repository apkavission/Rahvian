import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

/**
 * Any page the admin creates.
 *
 * ---------------------------------------------------------------------------
 * **The gap this closes, and it was a bad one.**
 *
 * `/admin/pages` has a "New page" button. It takes a title and a slug, creates
 * the row as a draft, drops you into the section builder, and lets you publish
 * — and until this file existed, nothing on the website rendered the result.
 * The page was in the database, marked published, reachable from the admin,
 * and returned 404 to everybody. Reported on 2026-08-31 as *"page bana diya
 * aur publish bhi kar diya lekin website pe nahi aaya"*, which is exactly what
 * happened: the page was made, the site had no route for it.
 *
 * The eleven pages that shipped with the product each have a file of their own
 * — `/about`, `/pricing`, `/contact` and so on — so the feature looked complete
 * from the inside. Every one of those is `is_system`, and the button makes
 * pages that are not.
 *
 * ---------------------------------------------------------------------------
 * **Why this does not shadow those eleven.**
 *
 * Two reasons, and the second is the one that matters. Next resolves a static
 * segment before a dynamic one, so `/about` reaches `about/page.tsx` and never
 * arrives here.
 *
 * But `/home` would, and `company.pages` holds a `home` row for the front page
 * — so without the `is_system` check below, the home page's content would be
 * served at a second address, competing with `/` in search results for the same
 * words. A page with its own route is refused here; a page without one is what
 * this is for. That is a property of the data rather than a list of slugs kept
 * in step by hand.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPage(slug);

  if (!result || result.page.is_system) return {};

  return buildMetadata({
    title: result.page.seo_title ?? result.page.title,
    description: result.page.seo_description,
    path: `/${slug}`,
    keywords: result.page.seo_keywords,
    noindex: result.page.noindex,
    canonical: result.page.canonical_url,
  });
}

export default async function CustomPage({ params }: Params) {
  const { slug } = await params;
  const result = await getPage(slug);

  /*
    Not found covers three different things on purpose: no such page, a page
    still in draft — row-level security refuses those, so `getPage` answers
    null — and a system page reached by the wrong door. A visitor needs the
    same answer for all three.
  */
  if (!result || result.page.is_system) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: `/${slug}` },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
