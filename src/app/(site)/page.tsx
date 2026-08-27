import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SectionRenderer } from "@/components/sections/renderer";
import { getPage } from "@/lib/queries/page";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const result = await getPage("home");

  return buildMetadata({
    title: result?.page.seo_title,
    // The home title already names the company, so it skips the template.
    templated: false,
    description: result?.page.seo_description,
    path: "/",
    keywords: result?.page.seo_keywords,
    noindex: result?.page.noindex ?? false,
    canonical: result?.page.canonical_url,
  });
}

/**
 * Home page.
 *
 * Holds no content of its own. Everything on it — the order of sections, every
 * headline, every card — comes from `company.pages` and `company.page_sections`,
 * so the owner can restructure this page from the admin panel without a
 * developer or a deploy.
 */
export default async function Home() {
  const result = await getPage("home");

  // The home page row is marked is_system, so it cannot be deleted. Reaching
  // notFound() here means it was unpublished, which is a deliberate act.
  if (!result) notFound();

  return <SectionRenderer sections={result.sections} />;
}
