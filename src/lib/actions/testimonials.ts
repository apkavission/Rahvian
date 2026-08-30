"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { getProjectOptions } from "@/lib/queries/testimonials-admin";
import { createClient } from "@/lib/supabase/server";
import { testimonialSchema, valuesToRow } from "@/lib/records/testimonials";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  type RecordActionState,
} from "@/lib/validation/records";

/**
 * Testimonial mutations.
 *
 * Every one clears `INVALIDATION_MAP.testimonials()`, which is the quote tag
 * and the pages together — a quote is rendered inside a case study rather than
 * on a page of its own, so clearing only the list would leave the page it
 * appears on serving the previous version indefinitely.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

function refresh() {
  for (const tag of INVALIDATION_MAP.testimonials()) updateTag(tag);
  revalidatePath("/admin/testimonials");
}

const createTestimonialSchema = z.object({
  author_name: z
    .string()
    .trim()
    .min(1, "Say who said it.")
    .max(160, "That name is too long."),
  quote: z
    .string()
    .trim()
    .min(1, "A testimonial needs the words that were said.")
    .max(1200, "That quote is too long — trim it rather than rewriting it."),
});

/**
 * Record a quote.
 *
 * Two fields, both of which the table requires, and a draft at the end of the
 * order. It cannot start as anything else: consent has not been recorded yet at
 * this point, and the table refuses to publish without it.
 */
export async function createTestimonial(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createTestimonialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("testimonials")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      author_name: parsed.data.author_name,
      quote: parsed.data.quote,
      status: "draft",
      consent_confirmed: false,
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[testimonials] create failed:", error.message);
    return { status: "error", message: "Could not record it." };
  }

  revalidatePath("/admin/testimonials");

  redirect(`/admin/testimonials?quote=${data.id}`);
}

export async function saveTestimonial(
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

  // Rebuilt from the same library the form was built from, so a photo id or a
  // portfolio entry that does not exist is refused rather than written.
  const [assets, projects] = await Promise.all([getMediaOptions(), getProjectOptions()]);
  const values = testimonialSchema(assets, projects).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("testimonials")
    .update(valuesToRow(values.data as Record<string, unknown>))
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[testimonials] save failed:", error.message);

    // The consent rule is checked above, so reaching it here means a row was
    // edited straight into the database. Say which rule refused it anyway.
    if (error.message.includes("testimonials_require_consent")) {
      return {
        status: "error",
        message:
          "The database refused to publish this without recorded consent. Tick the consent box, or leave it as a draft.",
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Saved." };
}

/** Move a quote one place along the order it is shown in. */
export async function moveTestimonial(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = moveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: quotes } = await supabase
    .from("testimonials")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!quotes) return { status: "error", message: "Could not read the list." };

  const index = quotes.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= quotes.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = quotes[index];
  const b = quotes[target];

  const [first, second] = await Promise.all([
    supabase.from("testimonials").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("testimonials").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[testimonials] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  refresh();

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a quote.
 *
 * A draft at the end, **with the consent left behind**. A duplicate is being
 * used as the starting point for a different statement, and carrying across a
 * tick that says "this person agreed to this" onto words that are about to be
 * changed is exactly how a quote nobody approved ends up published under
 * somebody's name.
 */
export async function duplicateTestimonial(
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

  const { data: quote } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!quote) return { status: "error", message: "That quote no longer exists." };

  const { data: last } = await supabase
    .from("testimonials")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data: created, error } = await supabase
    .from("testimonials")
    .insert({
      author_name: `${quote.author_name} (copy)`,
      author_role: quote.author_role,
      company_name: quote.company_name,
      quote: quote.quote,
      rating: quote.rating,
      avatar_id: quote.avatar_id,
      project_id: quote.project_id,
      status: "draft",
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,

      // Not carried across, on purpose. See the note above.
      consent_confirmed: false,
      consent_note: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[testimonials] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh();

  redirect(`/admin/testimonials?quote=${created.id}`);
}

/** Remove a quote. */
export async function deleteTestimonial(
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

  const { error } = await supabase.from("testimonials").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[testimonials] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Deleted." };
}
