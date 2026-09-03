import type { ComponentType } from "react";
import { BlogList } from "@/components/sections/blog-list";
import { CaseStudiesGrid } from "@/components/sections/case-studies-grid";
import { ContactChannels } from "@/components/sections/contact-channels";
import { CtaBand } from "@/components/sections/cta-band";
import { Faq } from "@/components/sections/faq";
import { FeatureGrid } from "@/components/sections/feature-grid";
import { Hero } from "@/components/sections/hero";
import { LegalDocument } from "@/components/sections/legal-document";
import { PageIntro } from "@/components/sections/page-intro";
import { PortfolioGrid } from "@/components/sections/portfolio-grid";
import { PricingTable } from "@/components/sections/pricing-table";
import { ProcessSteps } from "@/components/sections/process-steps";
import { ProductPromo } from "@/components/sections/product-promo";
import { ServicesGrid } from "@/components/sections/services-grid";
import { Story } from "@/components/sections/story";
import { Team } from "@/components/sections/team";
import { Testimonials } from "@/components/sections/testimonials";
import { TechStack } from "@/components/sections/tech-stack";
import { WhatWeBuild } from "@/components/sections/what-we-build";
import { WhyChooseUs } from "@/components/sections/why-choose-us";

/**
 * Section registry.
 *
 * `page_sections.type` in the database is a plain text column, deliberately —
 * adding a section type must never require a migration. This map is where a
 * type string becomes a component.
 *
 * To add a section type:
 *   1. Write the component, taking a single `content` prop.
 *   2. Register it here.
 *   3. Insert a `page_sections` row with that type.
 *
 * No schema change, no deploy of the database.
 *
 * NOTE ON VALIDATION: content arrives as JSONB and is cast at this boundary.
 * That is safe today because seed data is the only writer. The moment the
 * admin panel can write section content, each type needs a Zod schema —
 * validated on save, so malformed content is rejected at the point it is
 * created rather than crashing a page at render. The admin form fields are
 * generated from those same schemas, so the work is not duplicated.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SectionComponent = ComponentType<{ content: any }>;

export const SECTION_REGISTRY: Record<string, SectionComponent> = {
  hero: Hero,
  page_intro: PageIntro,
  what_we_build: WhatWeBuild,
  services_grid: ServicesGrid,
  why_choose_us: WhyChooseUs,
  product_promo: ProductPromo,
  process_steps: ProcessSteps,
  tech_stack: TechStack,
  story: Story,
  team: Team,
  testimonials: Testimonials,
  portfolio_grid: PortfolioGrid,
  case_studies_grid: CaseStudiesGrid,
  blog_list: BlogList,
  pricing_table: PricingTable,
  feature_grid: FeatureGrid,
  legal_document: LegalDocument,
  contact_channels: ContactChannels,
  faq: Faq,
  cta_band: CtaBand,
};

export function getSectionComponent(type: string): SectionComponent | null {
  return SECTION_REGISTRY[type] ?? null;
}
