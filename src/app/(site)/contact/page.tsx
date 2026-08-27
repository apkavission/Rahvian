import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

const SLUG = "contact";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage(SLUG);

  return buildMetadata({
    title: result?.page.seo_title ?? result?.page.title ?? "Contact",
    description: result?.page.seo_description,
    path: "/contact",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Contact.
 *
 * The short form, the channels that are configured, and the questions people
 * ask before they get in touch — all assembled from `page_sections`, so the
 * order and the copy are the owner's to change.
 *
 * Unlike `/request-a-quote`, which owns its markup because it is one long
 * form, this page is a composition: the same contact block can be dropped on
 * any other page from the admin without being rebuilt.
 */
export default async function ContactPage() {
  const result = await getPage(SLUG);

  if (!result) notFound();

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: result.page.title, path: "/contact" },
        ])}
      />
      <SectionRenderer sections={result.sections} />
    </>
  );
}
