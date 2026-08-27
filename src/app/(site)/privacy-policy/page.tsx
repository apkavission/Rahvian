import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "privacy-policy";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Privacy policy",
    description: result?.page.seo_description,
    path: "/privacy-policy",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Privacy policy.
 *
 * Every clause is a row, so the wording can be corrected the day something
 * about the business changes — which for a policy is not a nicety: a document
 * that describes data handling the company has since altered is worse than no
 * document, and needing a deploy is how that state persists.
 *
 * The entity's own details are read from `site_settings` by the section rather
 * than written into the clauses, so the registered address and identifiers are
 * stated once and match everywhere they appear.
 */
export default async function PrivacyPolicyPage() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/privacy-policy" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
