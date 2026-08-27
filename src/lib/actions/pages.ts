"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import { blankContent, getDefinition, schemaForType } from "@/lib/sections/definitions";
import {
  addSectionSchema,
  createPageSchema,
  moveSectionSchema,
  pageMetaSchema,
  saveSectionSchema,
  sectionIdSchema,
  type PageActionState,
} from "@/lib/validation/pages";

/**
 * Page and section mutations.
 *
 * Every one of them ends by clearing two things: the public cache tags for the
 * page, so a visitor sees the change within seconds without a deploy, and the
 * admin route itself, so the builder shows what it just saved.
 *
 * `updateTag` rather than `revalidateTag` for the public tags. The editor will
 * open the page in another tab to check; being served the previous version
 * reads as the save having failed.
 */

async function guard(): Promise<PageActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  // Editors may change content — that is the whole of their role. The role
  // check that matters here is the one RLS performs, from `is_staff()`.
  return null;
}

/**
 * A validated content object, as the column's type.
 *
 * The generated `Json` type is a recursive union that TypeScript cannot see a
 * plain `Record<string, unknown>` as a member of, even when every value in it
 * is one. The cast is safe precisely because it is applied to Zod's output:
 * the object has already been parsed field by field against the section's
 * schema, so nothing unserialisable can be inside it.
 */
function asJson(value: Record<string, unknown>): Json {
  return value as Json;
}

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

/** Clear the public caches for one page, and refresh the builder. */
function refresh(slug: string, pageId: string) {
  for (const tag of INVALIDATION_MAP.page(slug)) updateTag(tag);
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath("/admin/pages");
}

/** The slug, needed for cache invalidation, read before or after a write. */
async function slugOf(pageId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("pages").select("slug").eq("id", pageId).maybeSingle();
  return data?.slug ?? null;
}

/**
 * Create a page.
 *
 * It starts as a draft with no sections. A page that appeared on the live site
 * the moment it was named would be an empty page with a title, and the person
 * naming it is one click away from the builder where they will fill it in.
 *
 * `is_system` stays false: that flag means a route in the code reads this row
 * by slug, and a page created here has no such route. Which is also why the
 * builder tells the author to add the route — a page with no route is content
 * nobody can reach.
 */
export async function createPage(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createPageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      status: "draft",
      is_system: false,
      // The column is NOT NULL with a default, and the generated insert type
      // asks for it anyway. Stating the empty array is clearer than a cast.
      seo_keywords: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[pages] create failed:", error.message);
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "A page already uses that address."
          : "Could not create the page.",
      fieldErrors: error.code === "23505" ? { slug: "Already in use." } : undefined,
    };
  }

  revalidatePath("/admin/pages");
  updateTag("pages");

  // Straight into the builder: naming a page is the start of writing it.
  redirect(`/admin/pages/${data.id}`);
}

export async function savePageMeta(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = pageMetaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const input = parsed.data;
  const supabase = await createClient();

  // The old slug also has to be cleared: renaming a page leaves the cache
  // under its previous name holding content that is no longer served there.
  const previousSlug = await slugOf(input.page_id);

  const { error } = await supabase
    .from("pages")
    .update({
      title: input.title,
      slug: input.slug,
      status: input.status,
      seo_title: input.seo_title ?? null,
      seo_description: input.seo_description ?? null,
      canonical_url: input.canonical_url ?? null,
      schema_type: input.schema_type ?? null,
      noindex: Boolean(input.noindex),
    })
    .eq("id", input.page_id);

  if (error) {
    console.error("[pages] meta save failed:", error.message);
    return {
      status: "error",
      message: error.message.includes("duplicate")
        ? "That slug is already in use by another page."
        : "Could not save. Nothing was changed.",
    };
  }

  if (previousSlug && previousSlug !== input.slug) refresh(previousSlug, input.page_id);
  refresh(input.slug, input.page_id);

  return { status: "success", message: "The public page is already showing it." };
}

/**
 * Save one section's content.
 *
 * The content arrives as a JSON string from a single hidden input rather than
 * as a hundred named fields. Sections nest — repeaters inside groups inside
 * arrays — and encoding that into `FormData` names means writing a parser for
 * them on the way back out, which is a second place for the shape to be
 * decided. The JSON is validated against the schema derived from the same
 * field descriptors the form was rendered from, so nothing is trusted.
 */
export async function saveSection(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = saveSectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const schema = schemaForType(parsed.data.type);
  if (!schema) {
    return {
      status: "error",
      message: `"${parsed.data.type}" is not a section type this site knows about.`,
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data.content);
  } catch {
    return { status: "error", message: "The editor sent something unreadable. Reload and try again." };
  }

  const content = schema.safeParse(raw);
  if (!content.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(content.error.issues),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("page_sections")
    .update({
      content: asJson(content.data),
      background_variant: parsed.data.background_variant,
    })
    .eq("id", parsed.data.section_id);

  if (error) {
    console.error("[pages] section save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  const slug = await slugOf(parsed.data.page_id);
  if (slug) refresh(slug, parsed.data.page_id);

  return { status: "success", message: "The public page is already showing it." };
}

export async function addSection(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = addSectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || !getDefinition(parsed.data.type)) {
    return { status: "error", message: "That is not a section type this site knows about." };
  }

  const supabase = await createClient();

  // Appended to the end. Where it belongs is the editor's decision, made with
  // the move controls once they can see it in place.
  const { data: existing } = await supabase
    .from("page_sections")
    .select("sort_order")
    .eq("page_id", parsed.data.page_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("page_sections").insert({
    page_id: parsed.data.page_id,
    type: parsed.data.type,
    sort_order: nextOrder,
    // Added hidden. A half-filled section appearing on the live site the
    // moment it is created is how a placeholder gets published by accident.
    is_active: false,
    content: asJson(blankContent(parsed.data.type)),
    background_variant: "default",
  });

  if (error) {
    console.error("[pages] add section failed:", error.message);
    return { status: "error", message: "Could not add it. Nothing was changed." };
  }

  const slug = await slugOf(parsed.data.page_id);
  if (slug) refresh(slug, parsed.data.page_id);

  return { status: "success", message: "Added, and hidden until you show it." };
}

export async function toggleSection(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = sectionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: section } = await supabase
    .from("page_sections")
    .select("is_active")
    .eq("id", parsed.data.section_id)
    .maybeSingle();

  if (!section) return { status: "error", message: "That section no longer exists." };

  const { error } = await supabase
    .from("page_sections")
    .update({ is_active: !section.is_active })
    .eq("id", parsed.data.section_id);

  if (error) {
    console.error("[pages] toggle failed:", error.message);
    return { status: "error", message: "Could not do that. Nothing was changed." };
  }

  const slug = await slugOf(parsed.data.page_id);
  if (slug) refresh(slug, parsed.data.page_id);

  return { status: "success", message: section.is_active ? "Hidden." : "Now showing." };
}

/**
 * Move a section one place.
 *
 * Two rows swap their `sort_order`, in two statements. A single transaction
 * would be better and PostgREST cannot express one — the exposure is a moment
 * where two sections share an order, which the renderer breaks by id and which
 * the next move corrects. The alternative, an RPC, is worth writing the day
 * drag-and-drop replaces these buttons and reorders the whole list at once.
 */
export async function moveSection(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = moveSectionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: sections } = await supabase
    .from("page_sections")
    .select("id, sort_order")
    .eq("page_id", parsed.data.page_id)
    .order("sort_order", { ascending: true });

  if (!sections) return { status: "error", message: "Could not read the page." };

  const index = sections.findIndex((row) => row.id === parsed.data.section_id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= sections.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = sections[index];
  const b = sections[target];

  const [first, second] = await Promise.all([
    supabase.from("page_sections").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("page_sections").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[pages] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  const slug = await slugOf(parsed.data.page_id);
  if (slug) refresh(slug, parsed.data.page_id);

  return { status: "success", message: "Moved." };
}

export async function duplicateSection(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = sectionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: section } = await supabase
    .from("page_sections")
    .select("type, content, background_variant, sort_order")
    .eq("id", parsed.data.section_id)
    .maybeSingle();

  if (!section) return { status: "error", message: "That section no longer exists." };

  const { data: last } = await supabase
    .from("page_sections")
    .select("sort_order")
    .eq("page_id", parsed.data.page_id)
    .order("sort_order", { ascending: false })
    .limit(1);

  const { error } = await supabase.from("page_sections").insert({
    page_id: parsed.data.page_id,
    type: section.type,
    content: section.content,
    background_variant: section.background_variant,
    sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    is_active: false,
  });

  if (error) {
    console.error("[pages] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  const slug = await slugOf(parsed.data.page_id);
  if (slug) refresh(slug, parsed.data.page_id);

  return { status: "success", message: "Duplicated, and hidden until you show it." };
}

/**
 * Delete a section.
 *
 * The one destructive action in the builder, and it is a section rather than a
 * page: `pages.is_system` is protected by a trigger precisely because a code
 * route depends on the row. A section is content, and hiding it is one click
 * away for anyone who is unsure.
 */
export async function deleteSection(
  _previous: PageActionState,
  formData: FormData,
): Promise<PageActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = sectionIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("page_sections")
    .delete()
    .eq("id", parsed.data.section_id);

  if (error) {
    console.error("[pages] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  const slug = await slugOf(parsed.data.page_id);
  if (slug) refresh(slug, parsed.data.page_id);

  return { status: "success", message: "Deleted." };
}
