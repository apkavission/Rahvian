"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { createClient } from "@/lib/supabase/server";
import { getAdminServices } from "@/lib/queries/services-admin";
import { getAdminTechnologies } from "@/lib/queries/technologies";
import { PROJECT_TYPE_OPTIONS, projectSchema, valuesToRow } from "@/lib/records/projects";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  SLUG_PATTERN,
  type RecordActionState,
} from "@/lib/validation/records";
import type { Enums, Json } from "@/types/database";

/**
 * Portfolio mutations.
 *
 * Every one of them ends by clearing the same three caches through
 * `INVALIDATION_MAP.project` — the item's own page, the portfolio index, and
 * the home page, whose featured strip reads the same list. Naming the tags by
 * hand at each call site is how one of the three ends up stale, and a stale
 * index is the kind of bug nobody reports because the page still works.
 *
 * `updateTag` rather than `revalidateTag`, as the other content screens do: the
 * editor has the public page open in another tab, and being served the previous
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

/** Clear the public caches for one project, and refresh the admin screen. */
function refresh(slug: string) {
  for (const tag of INVALIDATION_MAP.project(slug)) updateTag(tag);
  revalidatePath("/admin/portfolio");
}

/** The slug as it currently stands, read before a write that may change it. */
async function slugOf(id: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("slug").eq("id", id).maybeSingle();
  return data?.slug ?? null;
}

/** The two option lists the schema validates the pickers against. */
async function pickers() {
  const [technologies, services] = await Promise.all([
    getAdminTechnologies(),
    getAdminServices(),
  ]);
  return { technologies, services };
}

/**
 * A new portfolio item.
 *
 * The client name is here rather than only in the main form because
 * `projects_client_named` is checked on **insert**, not on publication: a
 * client project with no client cannot be created at all, not even as a draft.
 * Asking for it afterwards would mean the very first thing anyone did on this
 * screen was refused by the database.
 */
const createProjectSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Give the project a title.")
      .max(160, "That title is too long."),
    slug: z
      .string()
      .trim()
      .min(1, "Give the project an address.")
      .max(120, "That address is too long.")
      .regex(SLUG_PATTERN.re, SLUG_PATTERN.message),
    type: z.enum(
      PROJECT_TYPE_OPTIONS.map((option) => option.value) as [string, ...string[]],
      { message: "Say what kind of work this is." },
    ),
    client_name: z.string().trim().max(160, "That name is too long.").optional(),
  })
  .superRefine((values, ctx) => {
    const client = values.client_name?.trim() ?? "";

    if (values.type === "client" && !client) {
      ctx.addIssue({
        code: "custom",
        path: ["client_name"],
        message: "Real client work has to name the client.",
      });
    }

    if ((values.type === "demo" || values.type === "inhouse") && client) {
      ctx.addIssue({
        code: "custom",
        path: ["client_name"],
        message:
          values.type === "demo"
            ? "A self-built demo has no client."
            : "Our own products do not have a client.",
      });
    }
  });

/**
 * Create a portfolio item.
 *
 * Three fields rather than two. A project cannot exist without knowing what
 * kind of work it is — the column is NOT NULL and three check constraints hang
 * off it — and asking later would mean asking after the client name had already
 * been typed into a row that may not carry one.
 *
 * It starts as a draft at the end of the order, so naming one never puts an
 * empty page on the live site and into the sitemap at the same moment.
 */
export async function createProject(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createProjectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("projects")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await supabase
    .from("projects")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      type: parsed.data.type as Enums<"project_type">,
      client_name: parsed.data.client_name?.trim() || null,
      summary: "",
      status: "draft",
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      // NOT NULL with a default, and the generated insert type asks for them
      // anyway. Stating the empty values is clearer than a cast.
      features: [] as unknown as Json,
      capabilities: [] as unknown as Json,
      gallery: [] as unknown as Json,
      variants: [] as unknown as Json,
      technology_ids: [],
      service_ids: [],
      seo_keywords: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[projects] create failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "A portfolio item already uses that address.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    const constraint = constraintFor(error.message);
    if (constraint) {
      return {
        status: "error",
        message: constraint.message,
        fieldErrors: { [constraint.field]: constraint.message },
      };
    }

    return { status: "error", message: "Could not create it." };
  }

  revalidatePath("/admin/portfolio");

  // Straight into the form: naming a project is the start of writing it up.
  redirect(`/admin/portfolio?project=${data.id}`);
}

/**
 * Save one portfolio item.
 *
 * The values arrive as one JSON field and are parsed against the schema built
 * from the same descriptors the form was rendered from — including the two
 * pickers, rebuilt here from the same queries, so an id that is not a technology
 * or a service is refused rather than written.
 */
export async function saveProject(
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

  const { technologies, services } = await pickers();
  const values = projectSchema(technologies, services, await getMediaOptions()).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const row = valuesToRow(values.data as Record<string, unknown>);
  const supabase = await createClient();

  // The previous slug has to be cleared too: renaming an item leaves the cache
  // under its old address holding a page that is no longer served there.
  const previousSlug = await slugOf(parsed.data.id);

  const { error } = await supabase.from("projects").update(row).eq("id", parsed.data.id);

  if (error) {
    console.error("[projects] save failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another portfolio item already uses that address.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    const constraint = constraintFor(error.message);
    if (constraint) {
      return {
        status: "error",
        message: constraint.message,
        fieldErrors: { [constraint.field]: constraint.message },
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  if (previousSlug && previousSlug !== row.slug) refresh(previousSlug);
  if (typeof row.slug === "string") refresh(row.slug);

  return { status: "success", message: "The public page is already showing it." };
}

/**
 * The four honesty constraints, in English.
 *
 * The schema restates all four and catches them first, so in practice these
 * never fire from the form. They exist for the write that does not come from
 * the form — an import, a script, a future screen — because a rejection that
 * reaches a person as `projects_demo_has_no_client` has taught them nothing.
 */
const CONSTRAINT_MESSAGES = [
  {
    name: "projects_client_named",
    field: "client_name",
    message: "Real client work has to name the client.",
  },
  {
    name: "projects_demo_has_no_client",
    field: "client_name",
    message: "A self-built demo can never name a client.",
  },
  {
    name: "projects_inhouse_has_no_client",
    field: "client_name",
    message: "Our own products do not have a client.",
  },
  {
    name: "projects_credentials_only_for_demos",
    field: "demo_credentials.email",
    message: "Only a self-built demo may publish a sign-in.",
  },
  {
    name: "projects_variants_only_for_demos",
    field: "variants",
    message: "Only a self-built demo has industry variants.",
  },
] as const;

/** The English for a constraint named in a Postgres error, if it is one of ours. */
function constraintFor(message: string) {
  return CONSTRAINT_MESSAGES.find((entry) => message.includes(entry.name));
}

/**
 * Move a portfolio item one place.
 *
 * Two rows swap their `sort_order`, in two statements, as everywhere else.
 * PostgREST cannot express a transaction, so the exposure is a moment where two
 * items share an order — which the list breaks by title and the next move
 * corrects.
 *
 * Worth knowing while using it: featured work leads the public grid regardless
 * of this order, so moving a non-featured item above a featured one changes
 * nothing a visitor sees.
 */
export async function moveProject(
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

  const { data: projects } = await supabase
    .from("projects")
    .select("id, slug, sort_order")
    .order("sort_order", { ascending: true });

  if (!projects) return { status: "error", message: "Could not read the list." };

  const index = projects.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= projects.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = projects[index];
  const b = projects[target];

  const [first, second] = await Promise.all([
    supabase.from("projects").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("projects").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[projects] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  refresh(a.slug);
  refresh(b.slug);

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a portfolio item.
 *
 * The copy is a draft, at the end, at the first free `-copy` address, and it is
 * not featured — a duplicate that appeared at the head of the grid the moment
 * it existed would be the half-edited one visitors saw first.
 */
export async function duplicateProject(
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

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!project) return { status: "error", message: "That item no longer exists." };

  const { data: taken } = await supabase.from("projects").select("slug, sort_order");
  const slugs = new Set((taken ?? []).map((row) => row.slug));

  let slug = `${project.slug}-copy`;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${project.slug}-copy-${n}`;

  const nextOrder = Math.max(0, ...(taken ?? []).map((row) => row.sort_order)) + 1;

  // Every column is named rather than spread. A spread would carry `id`,
  // `created_at` and `published_at` across as well — the last of which would
  // make a brand-new draft claim it was published months ago — and it would
  // silently copy any column added later.
  const { data: created, error } = await supabase
    .from("projects")
    .insert({
      title: `${project.title} (copy)`,
      slug,
      status: "draft",
      sort_order: nextOrder,
      is_featured: false,

      type: project.type,
      category: project.category,
      client_name: project.client_name,
      summary: project.summary,
      problem: project.problem,
      solution: project.solution,
      year: project.year,

      features: project.features,
      capabilities: project.capabilities,
      gallery: project.gallery,
      variants: project.variants,
      technology_ids: project.technology_ids,
      service_ids: project.service_ids,
      thumbnail_id: project.thumbnail_id,

      live_url: project.live_url,
      admin_demo_url: project.admin_demo_url,
      demo_credentials: project.demo_credentials,

      // The SEO fields deliberately do not come across. A duplicate that
      // inherits the original's title tag and canonical URL is two pages
      // telling search engines they are the same page.
      seo_keywords: [],
      og_image_id: project.og_image_id,
      noindex: project.noindex,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[projects] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh(slug);

  redirect(`/admin/portfolio?project=${created.id}`);
}

/**
 * Delete a portfolio item.
 *
 * The one irreversible action on this screen, which is why the button asks
 * first and the dialog offers archiving instead — that takes the item off the
 * site just as completely, and the write-up comes back if it was the wrong call.
 */
export async function deleteProject(
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

  const { error } = await supabase.from("projects").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[projects] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  if (slug) refresh(slug);

  return { status: "success", message: "Deleted." };
}
