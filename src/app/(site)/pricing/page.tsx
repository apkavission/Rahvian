import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getFaqs } from "@/lib/queries/faqs";
import { getPage } from "@/lib/queries/page";
import type { PageWithSections } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/structured-data";

const SLUG = "pricing";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Pricing",
    description: result?.page.seo_description,
    path: "/pricing",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Pricing.
 *
 * The cards come from `pricing_plans` through the `pricing_table` section, so
 * a price change is a row edit — the one piece of content most likely to need
 * changing without a developer anywhere near it.
 *
 * The `FAQPage` document is built from the same cached query the FAQ section
 * renders, and only when the page actually carries that section. Pricing is
 * where that matters most: "what does it cost" is the question this page is
 * trying to answer in the results themselves, and a rich result claiming
 * answers the page does not show is the version of that which gets penalised.
 */
export default async function PricingPage() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  const scope = faqScope(result.sections);
  const faqSchema = scope ? buildFaqSchema(await getFaqs(scope)) : null;

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/pricing" },
        ])}
      />
      {faqSchema && <JsonLd data={faqSchema} />}
      <SectionRenderer sections={result.sections} />
    </>
  );
}

/**
 * The scope of the FAQ section on this page, if it has one.
 *
 * Read from the section rather than assumed to be "pricing": the arrangement
 * of a page is the admin's, and a section they removed must take its
 * structured data with it.
 */
function faqScope(sections: PageWithSections["sections"]): string | null {
  for (const section of sections) {
    if (section.type !== "faq") continue;

    const content = section.content as { scope?: unknown } | null;
    if (content && typeof content.scope === "string") return content.scope;
  }

  return null;
}
