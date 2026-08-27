import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAdminProjects } from "@/lib/queries/projects-admin";
import { getAdminTechnologies } from "@/lib/queries/technologies";
import type { PickerOption } from "@/lib/records/case-studies";
import type { Tables } from "@/types/database";

export type CaseStudyRow = Tables<"case_studies">;

export interface CaseStudySummaryRow {
  id: string;
  slug: string;
  title: string;
  client_name: string | null;
  industry: string | null;
  problem: string | null;
  duration: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
}

const SUMMARY_COLUMNS =
  "id, slug, title, client_name, industry, problem, duration, status, published_at, updated_at";

/**
 * Every case study, drafts and archived ones included.
 *
 * Ordered the way the public index orders them — newest publication first —
 * except that unpublished work comes to the top rather than the bottom. A case
 * study has no `sort_order` column to arrange by hand, so this is the order,
 * and the drafts are what the person opening this screen came to finish.
 *
 * Uncached and through the session client, so RLS decides what comes back. The
 * public list is a separate, cached, anonymous query and the two must stay
 * separate.
 */
export async function getAdminCaseStudies(): Promise<CaseStudySummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select(SUMMARY_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: true });

  if (error) {
    console.error("[case-studies] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * One case study, every column, whatever its status.
 *
 * The image, the testimonial and the linked portfolio entry are embedded, so
 * the preview shows what the live page would show. The portfolio entry is read
 * here as staff, which means a draft project shows in the preview — correctly,
 * because the link will work the moment both are published.
 */
export interface AdminCaseStudy extends CaseStudyRow {
  image: { url: string; alt: string; width: number | null; height: number | null } | null;
  testimonial: {
    quote: string;
    author_name: string;
    author_role: string | null;
    company_name: string | null;
  } | null;
  project: { slug: string; title: string } | null;
}

export async function getAdminCaseStudy(id: string): Promise<AdminCaseStudy | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("case_studies")
    .select(
      `*, image:media!case_studies_og_image_id_fkey(public_url, alt_text, width, height),
       testimonial:testimonials(quote, author_name, author_role, company_name),
       project:projects(slug, title)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[case-studies] admin read failed for ${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  const { image, testimonial, project, ...study } = data as CaseStudyRow & {
    image:
      | { public_url: string; alt_text: string; width: number | null; height: number | null }
      | null;
    testimonial: AdminCaseStudy["testimonial"];
    project: AdminCaseStudy["project"];
  };

  return {
    ...study,
    image: image
      ? { url: image.public_url, alt: image.alt_text, width: image.width, height: image.height }
      : null,
    testimonial: testimonial?.quote ? testimonial : null,
    project: project ?? null,
  };
}

/**
 * Testimonials that may be attached to a case study.
 *
 * Only the ones with recorded consent. The table refuses to *publish* a quote
 * without it, so an unapproved one could be attached here and would then be
 * silently dropped from the page — offering it would be offering a dead end.
 */
export async function getAdminTestimonials(): Promise<
  { id: string; author_name: string; company_name: string | null; quote: string }[]
> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("id, author_name, company_name, quote")
    .eq("consent_confirmed", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[case-studies] testimonial list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * The three option lists the form offers and the schema validates against.
 *
 * Read here rather than exported from the actions file, because every export
 * from a `"use server"` module becomes a callable endpoint — and a list of
 * options is a read, not an action.
 *
 * The Server Action rebuilds these from the same function before it validates,
 * so an id that is not a technology, a portfolio entry or a consented
 * testimonial is refused rather than written.
 */
export async function caseStudyPickers(): Promise<{
  technologies: PickerOption[];
  projects: PickerOption[];
  testimonials: PickerOption[];
}> {
  const [technologies, projects, testimonials] = await Promise.all([
    getAdminTechnologies(),
    getAdminProjects(),
    getAdminTestimonials(),
  ]);

  return {
    technologies: technologies.map((tech) => ({ id: tech.id, label: tech.name })),
    // Drafts are offered and marked as such: a study and the portfolio entry it
    // describes are usually written in the same sitting, and the public page
    // already leaves the link out until that entry is published.
    projects: projects.map((project) => ({
      id: project.id,
      label:
        project.status === "published" ? project.title : `${project.title} (${project.status})`,
    })),
    testimonials: testimonials.map((entry) => ({
      id: entry.id,
      label: [entry.author_name, entry.company_name].filter(Boolean).join(" · "),
    })),
  };
}
