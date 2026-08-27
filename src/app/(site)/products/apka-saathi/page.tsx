import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildSoftwareApplicationSchema,
} from "@/lib/structured-data";

const SLUG = "products-apka-saathi";
const PATH = "/products/apka-saathi";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Apka Saathi",
    description: result?.page.seo_description,
    path: PATH,
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Apka Saathi — our own product.
 *
 * The page slug is `products-apka-saathi` rather than the URL path: `pages`
 * constrains a slug to a single segment, deliberately, so that a route in code
 * and a row in the database can never disagree about what a slash means.
 *
 * Labelled as ours throughout, in the section copy and in the graph below.
 * `SoftwareApplication` is emitted only when the page row asks for it, and it
 * carries no rating and no offer — this is a product we build, not one whose
 * reviews we have collected.
 */
export default async function ApkaSaathiPage() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  const { page } = result;

  return (
    <>
      {page.schema_type === "SoftwareApplication" && page.seo_description && (
        <JsonLd
          data={buildSoftwareApplicationSchema(
            { name: page.title, description: page.seo_description },
            PATH,
          )}
        />
      )}
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: page.title, path: PATH },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
