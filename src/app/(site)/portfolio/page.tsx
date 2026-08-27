import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "portfolio";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Portfolio",
    description: result?.page.seo_description,
    path: "/portfolio",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Portfolio index.
 *
 * The grids read `projects` live, so publishing a project puts it here with no
 * edit to this route. Each grid is scoped to a project type from the section's
 * own content, which is what keeps client work, our own products and
 * self-built demos in separate, labelled blocks rather than one pile a visitor
 * has to interpret.
 *
 * While a grid has nothing to show it renders its empty copy instead. That is
 * the honest position for a new company, and it costs nothing to be replaced.
 */
export default async function PortfolioIndex() {
  const result = await getPage(SLUG);

  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/portfolio" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
