import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "case-studies";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Case studies",
    description: result?.page.seo_description,
    path: "/case-studies",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Case studies index.
 *
 * Read from `case_studies` through the `case_studies_grid` section. Nothing is
 * published here yet, and the section's empty copy says why: a study is
 * written after a project is live and the client has agreed to be named.
 */
export default async function CaseStudiesIndex() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/case-studies" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
