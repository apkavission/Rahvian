import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "blog";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Blog",
    description: result?.page.seo_description,
    path: "/blog",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Blog index.
 *
 * The posts come from `blog_posts` through the `blog_list` section. The
 * archive is empty today and the section says so in the owner's own words
 * rather than showing a bare grid — writing appears here the moment a post is
 * published, with no edit to this route.
 */
export default async function BlogIndex() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/blog" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
