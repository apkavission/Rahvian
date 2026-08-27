"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { getAdminTechnologies } from "@/lib/queries/technologies";
import { serviceSchema, valuesToRow } from "@/lib/records/services";
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
 * Service mutations.
 *
 * Every one of them ends by clearing the same three caches through
 * `INVALIDATION_MAP.service` — the service's own page, the services list, and
 * the home page, whose grid reads that same list. Naming the tags by hand at
 * each call site is how one of the three ends up stale, and a stale list is the
 * kind of bug nobody reports because the page still works.
 *
 * `updateTag` rather than `revalidateTag`, as the page builder does: the editor
 * has the public page open in another tab, and being served the previous
 * version reads as the save having failed.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  // Editors may change content — that is their whole role. The check that
  // decides is the one RLS performs, from `is_staff()`.
  return null;
}

/** Clear the public caches for one service, and refresh the admin screen. */
function refresh(slug: string) {
  for (const tag of INVALIDATION_MAP.service(slug)) updateTag(tag);
  revalidatePath("/admin/services");
}

/** The slug as it currently stands, read before a write that may change it. */
async function slugOf(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("slug").eq("id", id).maybeSingle();
  return data?.slug ?? null;
}

const createServiceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the service a name.")
    .max(120, "That name is too long."),
  slug: z
    .string()
    .trim()
    .min(1, "Give the service an address.")
    .max(120, "That address is too long.")
    .regex(SLUG_PATTERN.re, SLUG_PATTERN.message),
});

/**
 * Create a service.
 *
 * It starts as a draft at the end of the order, with an empty summary. A
 * service that appeared on the site, in the navigation and in the sitemap the
 * moment it was named would be an empty page with a heading — and the person
 * naming it is one redirect away from the form that fills it in.
 */
export async function createService(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createServiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("services")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await supabase
    .from("services")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      summary: "",
      status: "draft",
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      // NOT NULL with a default, and the generated insert type asks for them
      // anyway. Stating the empty values is clearer than a cast.
      body: [] as unknown as Json,
      included_items: [] as unknown as Json,
      audience: [] as unknown as Json,
      approach: [] as unknown as Json,
      technology_ids: [],
      seo_keywords: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[services] create failed:", error.message);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "A service already uses that address."
          : "Could not create the service.",
      fieldErrors: error.code === "23505" ? { slug: "Already in use." } : undefined,
    };
  }

  revalidatePath("/admin/services");

  // Straight into the form: naming a service is the start of writing it.
  redirect(`/admin/services?service=${data.id}`);
}

/**
 * Save one service.
 *
 * The values arrive as one JSON field and are parsed against the schema built
 * from the same descriptors the form was rendered from — including the
 * technology options, rebuilt here from the same query, so an id that is not a
 * technology is refused rather than written.
 */
export async function saveService(
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

  const technologies = await getAdminTechnologies();
  const values = serviceSchema(technologies, await getMediaOptions()).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const row = valuesToRow(values.data as Record<string, unknown>);
  const supabase = await createClient();

  // The previous slug has to be cleared too: renaming a service leaves the
  // cache under its old address holding a page that is no longer served there.
  const previousSlug = await slugOf(parsed.data.id);

  const { error } = await supabase.from("services").update(row).eq("id", parsed.data.id);

  if (error) {
    console.error("[services] save failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another service already uses that address.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    if (error.message.includes("services_pricing_present")) {
      return {
        status: "error",
        message: "A published service needs a starting price, or the priced-per-project switch.",
        fieldErrors: { price_from: "Set a price, or switch on priced per project." },
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  if (previousSlug && previousSlug !== row.slug) refresh(previousSlug);
  if (typeof row.slug === "string") refresh(row.slug);

  return { status: "success", message: "The public page is already showing it." };
}

/**
 * Move a service one place.
 *
 * Two rows swap their `sort_order`, in two statements, exactly as sections do.
 * PostgREST cannot express a transaction, so the exposure is a moment where two
 * services share an order — which the list breaks by name and the next move
 * corrects. An RPC becomes worth writing the day drag-and-drop reorders the
 * whole list at once.
 */
export async function moveService(
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

  const { data: services } = await supabase
    .from("services")
    .select("id, slug, sort_order")
    .order("sort_order", { ascending: true });

  if (!services) return { status: "error", message: "Could not read the list." };

  const index = services.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= services.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = services[index];
  const b = services[target];

  const [first, second] = await Promise.all([
    supabase.from("services").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("services").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[services] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  // Both rows moved, and the order is read by the grid on every page that
  // lists services — so both slugs are cleared, not just the one that was
  // clicked.
  refresh(a.slug);
  refresh(b.slug);

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a service.
 *
 * The copy is a draft, at the end, at the first free `-copy` address. Starting
 * from a filled-in service is how the eighth one gets written; starting from a
 * copy that is live the moment it exists is how a half-edited duplicate of an
 * existing page reaches search engines.
 */
export async function duplicateService(
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

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!service) return { status: "error", message: "That service no longer exists." };

  const { data: taken } = await supabase.from("services").select("slug, sort_order");
  const slugs = new Set((taken ?? []).map((row) => row.slug));

  let slug = `${service.slug}-copy`;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${service.slug}-copy-${n}`;

  const nextOrder =
    Math.max(0, ...(taken ?? []).map((row) => row.sort_order)) + 1;

  // Every column is named rather than spread. A spread would carry `id`,
  // `created_at` and `published_at` across as well — the last of which would
  // make a brand-new draft claim it was published months ago — and it would
  // silently copy any column added later, which is exactly the kind of thing
  // that is only noticed once it is wrong.
  const { data: created, error } = await supabase
    .from("services")
    .insert({
      name: `${service.name} (copy)`,
      slug,
      status: "draft",
      sort_order: nextOrder,

      short_name: service.short_name,
      icon: service.icon,
      summary: service.summary,
      hero_heading: service.hero_heading,
      hero_subheading: service.hero_subheading,

      body: service.body,
      included_items: service.included_items,
      audience: service.audience,
      approach: service.approach,
      technology_ids: service.technology_ids,

      price_from: service.price_from,
      price_note: service.price_note,
      is_custom_quote: service.is_custom_quote,

      // The SEO fields deliberately do not come across. A duplicate that
      // inherits the original's title tag and canonical URL is two pages
      // telling search engines they are the same page.
      seo_keywords: [],
      og_image_id: service.og_image_id,
      noindex: service.noindex,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[services] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh(slug);

  redirect(`/admin/services?service=${created.id}`);
}

/**
 * Delete a service.
 *
 * The one irreversible action on this screen, which is why the button asks
 * first and the dialog offers archiving instead — that is what the person
 * usually meant, it takes the service off the site just as completely, and the
 * words come back if they were wrong.
 */
export async function deleteService(
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

  const { error } = await supabase.from("services").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[services] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  if (slug) refresh(slug);

  return { status: "success", message: "Deleted." };
}
