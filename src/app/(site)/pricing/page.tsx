import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

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
 * The `FAQPage` document used to be built here, by reading this page's own
 * sections to find the FAQ one and pulling its scope out. That moved into the
 * FAQ section itself on 2026-08-28: emitting it per route meant every other
 * page carrying an FAQ silently had none, because it was something a developer
 * had to remember. The section that renders the questions now declares them.
 */
export default async function PricingPage() {
  const result = await getPage(SLUG);

  // The row is marked is_system, so a trigger blocks deletion. Reaching this
  // means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/pricing" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
