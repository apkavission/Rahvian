"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAdminPricingPlans } from "@/lib/queries/pricing-admin";
import { pricingSchema, valuesToRow } from "@/lib/records/pricing";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  SLUG_PATTERN,
  type RecordActionState,
} from "@/lib/validation/records";
import type { Json } from "@/types/database";

/**
 * Pricing plan mutations.
 *
 * Simpler to invalidate than the other content screens, because a plan has no
 * page of its own: every card is read by `getPricingPlans()` under one tag, so
 * `INVALIDATION_MAP.pricing()` clears everything a change can affect. There is
 * no slug to track across a rename for that reason — `pricing_plans.slug`
 * identifies the row, it does not address a URL.
 *
 * `updateTag` rather than `revalidateTag`, as every other content screen does:
 * the editor has `/pricing` open in another tab, and being served the previous
 * figure reads as the save having failed — which on a price is the one place
 * that misreading is expensive.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

/** Clear the public cache for the pricing cards, and refresh the admin screen. */
function refresh() {
  for (const tag of INVALIDATION_MAP.pricing()) updateTag(tag);
  revalidatePath("/admin/pricing");
}

const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the plan a name.")
    .max(120, "That name is too long."),
  slug: z
    .string()
    .trim()
    .min(1, "Give the plan a reference.")
    .max(120, "That reference is too long.")
    .regex(SLUG_PATTERN.re, SLUG_PATTERN.message),
});

/**
 * Create a plan.
 *
 * It starts as a draft at the end of the row, priced by the brief. Custom
 * rather than free: a new plan with no figure and no switch is a row the
 * database would refuse to publish, and starting it in the one state that
 * cannot be published is starting it broken.
 */
export async function createPlan(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("pricing_plans")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await supabase
    .from("pricing_plans")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      status: "draft",
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      is_custom_quote: true,
      // NOT NULL with a default, and the generated insert type asks for it
      // anyway. Stating the empty value is clearer than a cast.
      features: [] as unknown as Json,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pricing] create failed:", error.message);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "A plan already uses that reference."
          : "Could not create it.",
      fieldErrors: error.code === "23505" ? { slug: "Already in use." } : undefined,
    };
  }

  revalidatePath("/admin/pricing");

  redirect(`/admin/pricing?plan=${data.id}`);
}

export async function savePlan(
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

  const values = pricingSchema().safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const row = valuesToRow(values.data as Record<string, unknown>);
  const supabase = await createClient();

  const { error } = await supabase
    .from("pricing_plans")
    .update(row)
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[pricing] save failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another plan already uses that reference.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    // The table's own check constraint, in case a request reaches it around
    // the form. The schema states the same rule, so this is the second line.
    if (error.code === "23514") {
      return {
        status: "error",
        message: "A published plan needs a starting price, or the custom-quote switch.",
        fieldErrors: { price_from: "Needed to publish this plan." },
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "The pricing page is already showing it." };
}

/**
 * Move a plan one place along the row.
 *
 * The order of price cards is an argument, not a list: the plan on the left is
 * read as the entry point and the one in the middle as the recommendation. It
 * is the owner's to arrange, which is why it is two buttons on the list rather
 * than a number in the form.
 */
export async function movePlan(
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

  const { data: plans } = await supabase
    .from("pricing_plans")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!plans) return { status: "error", message: "Could not read the list." };

  const index = plans.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= plans.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = plans[index];
  const b = plans[target];

  const [first, second] = await Promise.all([
    supabase.from("pricing_plans").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("pricing_plans").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[pricing] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  refresh();

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a plan.
 *
 * The copy is a draft at the end, at the first free `-copy` reference, and it
 * never carries the highlight across — two cards wearing "most asked for" is
 * two cards that say nothing.
 */
export async function duplicatePlan(
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

  const { data: plan } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!plan) return { status: "error", message: "That plan no longer exists." };

  const existing = await getAdminPricingPlans();
  const slugs = new Set(existing.map((row) => row.slug));

  let slug = `${plan.slug}-copy`;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${plan.slug}-copy-${n}`;

  const last = existing[existing.length - 1];

  // Every column is named rather than spread, so `id`, `created_at` and
  // `published_at` cannot come across — the last of which would make a
  // brand-new draft claim it went live months ago.
  const { data: created, error } = await supabase
    .from("pricing_plans")
    .insert({
      name: `${plan.name} (copy)`,
      slug,
      status: "draft",
      sort_order: (last?.sort_order ?? 0) + 1,

      tagline: plan.tagline,
      price_from: plan.price_from,
      currency: plan.currency,
      price_note: plan.price_note,
      is_custom_quote: plan.is_custom_quote,
      features: plan.features,
      cta_label: plan.cta_label,
      cta_href: plan.cta_href,

      // Not carried across, on purpose. See the note above.
      is_highlighted: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pricing] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh();

  redirect(`/admin/pricing?plan=${created.id}`);
}

/**
 * Delete a plan.
 *
 * The one irreversible action on this screen, which is why the button asks
 * first and the dialog offers archiving instead — that takes the card off the
 * pricing page just as completely, and the figures come back if it was the
 * wrong call.
 */
export async function deletePlan(
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

  const { error } = await supabase.from("pricing_plans").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[pricing] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Deleted." };
}
