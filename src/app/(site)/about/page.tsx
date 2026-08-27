import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "about";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "About",
    description: result?.page.seo_description,
    path: "/about",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * About.
 *
 * Every word on this page comes from `page_sections`, including the story
 * itself — how a company describes itself is the copy most likely to be
 * rewritten, and needing a developer for that is exactly what this
 * architecture exists to avoid.
 *
 * The team section reads `team_members` and disappears while that table is
 * empty, so the page is correct before anyone is listed and complete
 * afterwards, with no edit here either way.
 */
export default async function AboutPage() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/about" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
