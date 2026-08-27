import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "terms-and-conditions";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Terms and conditions",
    description: result?.page.seo_description,
    path: "/terms-and-conditions",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Terms and conditions.
 *
 * These govern use of the website and set out how an engagement is entered
 * into — the written scope, the payment schedule, what is handed over. The
 * per-project contract is a separate document, and the clauses here say so
 * rather than pretending a website footer can bind a project.
 */
export default async function TermsPage() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/terms-and-conditions" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
