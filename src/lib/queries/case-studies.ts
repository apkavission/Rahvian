import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type CaseStudy = Tables<"case_studies">;

export interface CaseStudyImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

const CARD_COLUMNS = `
  id, slug, title, client_name, industry, problem, duration, published_at,
  image:media!case_studies_og_image_id_fkey(public_url, alt_text, width, height)
`;

export interface CaseStudyCard {
  id: string;
  slug: string;
  title: string;
  client_name: string | null;
  industry: string | null;
  problem: string | null;
  duration: string | null;
  published_at: string | null;
  image: CaseStudyImage | null;
}

export interface CaseStudyDetail extends CaseStudy {
  image: CaseStudyImage | null;
  testimonial: {
    quote: string;
    author_name: string;
    author_role: string | null;
    company_name: string | null;
  } | null;
  /** The portfolio entry this study is about, when it is published. */
  project: { slug: string; title: string } | null;
}

/**
 * Every published case study, newest first.
 *
 * RLS restricts this to published rows. `results` is not read for the card:
 * the column is nullable precisely because we do not manufacture outcomes, and
 * a card that shows a metric for one study and a gap for the next invites the
 * gap to be filled with something invented.
 */
export const getCaseStudies = unstable_cache(
  async (): Promise<CaseStudyCard[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("case_studies")
      .select(CARD_COLUMNS)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[case-studies] list failed:", error.message);
      return [];
    }

    return (data ?? []).map(
      (row) => ({ ...row, image: toImage(row.image) }) as CaseStudyCard,
    );
  },
  ["case-studies-list"],
  { tags: [CACHE_TAGS.caseStudies] },
);

/**
 * One case study, in full.
 *
 * The testimonial is embedded rather than fetched separately, and the table it
 * comes from refuses to publish a quote without recorded consent — so a study
 * can never carry an unapproved one.
 */
export function getCaseStudy(slug: string) {
  return unstable_cache(
    async (): Promise<CaseStudyDetail | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("case_studies")
        .select(
          `*, image:media!case_studies_og_image_id_fkey(public_url, alt_text, width, height),
           testimonial:testimonials(quote, author_name, author_role, company_name),
           project:projects(slug, title)`,
        )
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(`[case-studies] read failed for "${slug}":`, error.message);
        return null;
      }
      if (!data) return null;

      return {
        ...data,
        image: toImage(data.image),
        testimonial: toTestimonial(data.testimonial),
        // An unpublished project embeds as null under RLS, which is the right
        // answer: the link would 404 for a visitor.
        project: (data.project as CaseStudyDetail["project"]) ?? null,
      } as CaseStudyDetail;
    },
    ["case-study", slug],
    { tags: [CACHE_TAGS.caseStudies, CACHE_TAGS.caseStudy(slug)] },
  )();
}

type EmbeddedMedia =
  | { public_url: string; alt_text: string; width: number | null; height: number | null }
  | null
  | undefined;

function toImage(row: unknown): CaseStudyImage | null {
  const media = row as EmbeddedMedia;
  if (!media) return null;
  return {
    url: media.public_url,
    alt: media.alt_text,
    width: media.width,
    height: media.height,
  };
}

function toTestimonial(row: unknown): CaseStudyDetail["testimonial"] {
  const testimonial = row as CaseStudyDetail["testimonial"];
  if (!testimonial || !testimonial.quote) return null;
  return testimonial;
}
