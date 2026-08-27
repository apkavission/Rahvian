import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "services";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Services",
    description: result?.page.seo_description,
    path: "/services",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Services index.
 *
 * Like the home page it holds no copy of its own — the introduction and the
 * closing ask come from `page_sections`. The seven cards in between are read
 * live from `company.services` by the `services_grid` section, so publishing
 * an eighth service adds it here with no edit to this route.
 */
export default async function ServicesIndex() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
