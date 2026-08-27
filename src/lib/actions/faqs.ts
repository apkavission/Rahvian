"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { faqScopeOptions } from "@/lib/queries/faqs-admin";
import { faqSchema, valuesToRow } from "@/lib/records/faqs";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  type RecordActionState,
} from "@/lib/validation/records";

/**
 * FAQ mutations.
 *
 * Every one of them clears `INVALIDATION_MAP.faqs()`, which is the FAQ tag and
 * the pages tag together. Both, because a question is read twice on the page
 * that carries it: once by the accordion and once by the route that emits the
 * `FAQPage` structured data for it. Clearing only the first would leave search
 * engines being told about a question the page no longer shows — the kind of
 * mismatch a manual review penalises.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

function refresh() {
  for (const tag of INVALIDATION_MAP.faqs()) updateTag(tag);
  revalidatePath("/admin/faqs");
}

const createFaqSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1, "Write the question.")
    .max(300, "That question is too long."),
  answer: z
    .string()
    .trim()
    .min(1, "Write the answer. A question with no answer is not an FAQ, and the database refuses it.")
    .max(2000, "That answer is too long."),
  scope: z.string().trim().optional(),
});

/**
 * Add a question.
 *
 * Both fields are required here rather than only the question, because the
 * table's check constraint refuses an empty answer — a create form that offers
 * to start one without it would be offering a row that cannot be written.
 *
 * It arrives hidden and attached to whichever page the list was filtered to, so
 * a half-thought-out answer never appears on the site, and the one obvious
 * scope does not have to be ticked by hand straight afterwards.
 */
export async function createFaq(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createFaqSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  // The scope comes from the list's own filter, so it is checked against the
  // offered options rather than trusted — a posted request could name anything.
  const offered = new Set((await faqScopeOptions()).map((option) => option.value));
  const scope =
    parsed.data.scope && offered.has(parsed.data.scope) ? [parsed.data.scope] : [];

  const { data, error } = await supabase
    .from("faqs")
    .insert({
      question: parsed.data.question,
      answer: parsed.data.answer,
      scope,
      is_active: false,
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[faqs] create failed:", error.message);
    return { status: "error", message: "Could not add it." };
  }

  revalidatePath("/admin/faqs");

  redirect(`/admin/faqs?faq=${data.id}${scope.length > 0 ? `&scope=${scope[0]}` : ""}`);
}

export async function saveFaq(
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

  // Rebuilt from the same function the form was built from, so a scope that is
  // not an offered page is refused rather than written.
  const values = faqSchema(await faqScopeOptions()).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("faqs")
    .update(valuesToRow(values.data as Record<string, unknown>))
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[faqs] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Every page that carries it is already showing it." };
}

/**
 * Move a question one place, within the page the list is filtered to.
 *
 * The scope is bound to the action by the list rather than posted with the
 * form, because the swap has to happen against the questions the person can
 * actually see. `faqs.sort_order` is one number across every page, so swapping
 * with the next row in the *whole* table would routinely swap a pricing
 * question with a contact one — two rows that never appear together, leaving
 * the arrows looking broken on both pages.
 *
 * An empty scope means the unfiltered list, where the whole table is what is
 * shown and the global neighbour is the right one.
 */
export async function moveFaq(
  scope: string,
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

  const { data: all } = await supabase
    .from("faqs")
    .select("id, scope, sort_order")
    .order("sort_order", { ascending: true });

  if (!all) return { status: "error", message: "Could not read the list." };

  const shown = scope ? all.filter((row) => (row.scope ?? []).includes(scope)) : all;

  const index = shown.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= shown.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = shown[index];
  const b = shown[target];

  const [first, second] = await Promise.all([
    supabase.from("faqs").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("faqs").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[faqs] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  refresh();

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a question.
 *
 * Hidden, at the end, keeping the scopes. Starting from an answer that is
 * nearly right is how the second version of it gets written; starting from one
 * that is live the moment it exists is how the same question appears twice on
 * a page.
 */
export async function duplicateFaq(
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

  const { data: faq } = await supabase
    .from("faqs")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!faq) return { status: "error", message: "That question no longer exists." };

  const { data: last } = await supabase
    .from("faqs")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data: created, error } = await supabase
    .from("faqs")
    .insert({
      question: `${faq.question} (copy)`,
      answer: faq.answer,
      scope: faq.scope,
      is_active: false,
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[faqs] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh();

  redirect(`/admin/faqs?faq=${created.id}`);
}

/**
 * Delete a question.
 *
 * The one irreversible action on this screen, which is why the button asks
 * first and the dialog offers the switch instead — unticking "show this
 * question" takes it off every page just as completely, and the answer comes
 * back if it was the wrong call.
 */
export async function deleteFaq(
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

  const { error } = await supabase.from("faqs").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[faqs] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Deleted." };
}
