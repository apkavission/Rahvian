"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { createClient } from "@/lib/supabase/server";
import {
  caseStudyPickers,
  getAdminCaseStudies,
} from "@/lib/queries/case-studies-admin";
import { caseStudySchema, valuesToRow } from "@/lib/records/case-studies";
import {
  fieldErrors,
  recordIdSchema,
  saveRecordSchema,
  SLUG_PATTERN,
  type RecordActionState,
} from "@/lib/validation/records";
import type { Json } from "@/types/database";

/**
 * Case study mutations.
 *
 * Each one clears the study's own page and the index that lists it, through
 * `INVALIDATION_MAP.caseStudy`. `updateTag` rather than `revalidateTag`, as the
 * other content screens do: the editor has the public page open in another tab,
 * and being served the previous version reads as the save having failed.
 *
 * There is no move action. `case_studies` has no `sort_order` — the index is
 * ordered by publication date — so the only way to change the order is to
 * change what is published, which is the status field.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

function refresh(slug: string) {
  for (const tag of INVALIDATION_MAP.caseStudy(slug)) updateTag(tag);
  revalidatePath("/admin/case-studies");
}

async function slugOf(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("case_studies").select("slug").eq("id", id).maybeSingle();
  return data?.slug ?? null;
}

const createCaseStudySchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the case study a title.")
    .max(200, "That title is too long."),
  slug: z
    .string()
    .trim()
    .min(1, "Give the case study an address.")
    .max(120, "That address is too long.")
    .regex(SLUG_PATTERN.re, SLUG_PATTERN.message),
});

/**
 * Create a case study.
 *
 * Two fields. Everything else about a case study is optional at the database
 * level — deliberately, because a write-up is worth publishing before every
 * part of it has been filled in.
 */
export async function createCaseStudy(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createCaseStudySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("case_studies")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      status: "draft",
      // NOT NULL with a default, and the generated insert type asks for them
      // anyway. Stating the empty values is clearer than a cast.
      features: [] as unknown as Json,
      screenshots: [] as unknown as Json,
      technology_ids: [],
      seo_keywords: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[case-studies] create failed:", error.message);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "A case study already uses that address."
          : "Could not create it.",
      fieldErrors: error.code === "23505" ? { slug: "Already in use." } : undefined,
    };
  }

  revalidatePath("/admin/case-studies");

  redirect(`/admin/case-studies?study=${data.id}`);
}

export async function saveCaseStudy(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = saveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data.values);
  } catch {
    return {
      status: "error",
      message: "The editor sent something unreadable. Reload the page and try again.",
    };
  }

  const { technologies, projects, testimonials } = await caseStudyPickers();
  const values = caseStudySchema(
    technologies,
    projects,
    testimonials,
    await getMediaOptions(),
  ).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const row = valuesToRow(values.data as Record<string, unknown>);
  const supabase = await createClient();

  const previousSlug = await slugOf(parsed.data.id);

  const { error } = await supabase.from("case_studies").update(row).eq("id", parsed.data.id);

  if (error) {
    console.error("[case-studies] save failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another case study already uses that address.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  if (previousSlug && previousSlug !== row.slug) refresh(previousSlug);
  if (typeof row.slug === "string") refresh(row.slug);

  return { status: "success", message: "The public page is already showing it." };
}

/**
 * Duplicate a case study.
 *
 * The copy is a draft at the first free `-copy` address. The testimonial is
 * deliberately not carried across: a quote was given about one piece of work,
 * and attaching it to a second write-up without being asked again is putting
 * words in someone's mouth.
 */
export async function duplicateCaseStudy(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: study } = await supabase
    .from("case_studies")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!study) return { status: "error", message: "That case study no longer exists." };

  const existing = await getAdminCaseStudies();
  const slugs = new Set(existing.map((row) => row.slug));

  let slug = `${study.slug}-copy`;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${study.slug}-copy-${n}`;

  // Every column is named rather than spread, so `id`, `created_at` and
  // `published_at` cannot come across — the last of which would make a
  // brand-new draft claim it was published months ago.
  const { data: created, error } = await supabase
    .from("case_studies")
    .insert({
      title: `${study.title} (copy)`,
      slug,
      status: "draft",

      client_name: study.client_name,
      industry: study.industry,
      duration: study.duration,
      problem: study.problem,
      solution: study.solution,
      features: study.features,
      results: study.results,
      screenshots: study.screenshots,
      technology_ids: study.technology_ids,
      project_id: study.project_id,

      // Not carried across, on purpose. See the note above.
      testimonial_id: null,

      // Nor are the SEO fields: a duplicate that inherits the original's title
      // tag and canonical URL is two pages telling search engines they are the
      // same page.
      seo_keywords: [],
      og_image_id: study.og_image_id,
      noindex: study.noindex,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[case-studies] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh(slug);

  redirect(`/admin/case-studies?study=${created.id}`);
}

/**
 * Delete a case study.
 *
 * The one irreversible action on this screen, which is why the button asks
 * first and the dialog offers archiving instead — that takes it off the site
 * just as completely, and the write-up comes back if it was the wrong call.
 */
export async function deleteCaseStudy(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const slug = await slugOf(parsed.data.id);
  const supabase = await createClient();

  const { error } = await supabase.from("case_studies").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[case-studies] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  if (slug) refresh(slug);

  return { status: "success", message: "Deleted." };
}
