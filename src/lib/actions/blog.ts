"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CACHE_TAGS, INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { createClient } from "@/lib/supabase/server";
import {
  categoryOptions,
  getAdminCategories,
  getAdminPosts,
  postSlugsInCategory,
} from "@/lib/queries/blog-admin";
import {
  categorySchema,
  categoryValuesToRow,
  postSchema,
  postValuesToRow,
} from "@/lib/records/blog";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  SLUG_PATTERN,
  type RecordActionState,
} from "@/lib/validation/records";

/**
 * Blog mutations — posts and categories.
 *
 * Posts clear their own page and the index, through `INVALIDATION_MAP.post`.
 * Categories clear more than themselves: a category's name appears in the
 * breadcrumb of every post filed under it, so renaming one has to clear those
 * post pages as well. That is a query, not a guess — see `refreshCategory`.
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
  return null;
}

function refreshPost(slug: string) {
  for (const tag of INVALIDATION_MAP.post(slug)) updateTag(tag);
  revalidatePath("/admin/blog");
}

/**
 * Clear a category and everything that shows its name.
 *
 * The blog tag covers the index and the category list. What it does not cover
 * is each post's own page, which is cached under `post:<slug>` and prints the
 * category in its breadcrumb — so those slugs are read and cleared by name.
 */
async function refreshCategory(categoryId: string | null) {
  updateTag(CACHE_TAGS.blog);

  if (categoryId) {
    for (const slug of await postSlugsInCategory(categoryId)) {
      updateTag(CACHE_TAGS.post(slug));
    }
  }

  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/blog");
}

async function slugOf(table: "blog_posts" | "blog_categories", id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from(table).select("slug").eq("id", id).maybeSingle();
  return data?.slug ?? null;
}

const titleAndSlug = (noun: string) =>
  z.object({
    title: z
      .string()
      .trim()
      .min(1, `Give the ${noun} a title.`)
      .max(200, "That title is too long."),
    slug: z
      .string()
      .trim()
      .min(1, `Give the ${noun} an address.`)
      .max(120, "That address is too long.")
      .regex(SLUG_PATTERN.re, SLUG_PATTERN.message),
  });

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

const createPostSchema = titleAndSlug("post");

/**
 * Start a post.
 *
 * Two fields and an empty body. Everything else — the excerpt, the category,
 * the tags — is written alongside the article itself, in the form this lands in.
 */
export async function createPost(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createPostSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      content: "",
      status: "draft",
      // NOT NULL with a default, and the generated insert type asks for them
      // anyway. Stating the empty values is clearer than a cast.
      tags: [],
      seo_keywords: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[blog] create post failed:", error.message);
    return {
      status: "error",
      message:
        error.code === "23505" ? "A post already uses that address." : "Could not create it.",
      fieldErrors: error.code === "23505" ? { slug: "Already in use." } : undefined,
    };
  }

  revalidatePath("/admin/blog");

  redirect(`/admin/blog?post=${data.id}`);
}

export async function savePost(
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

  const values = postSchema(await categoryOptions(), await getMediaOptions()).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const row = postValuesToRow(values.data as Record<string, unknown>);
  const supabase = await createClient();

  const previousSlug = await slugOf("blog_posts", parsed.data.id);

  const { error } = await supabase.from("blog_posts").update(row).eq("id", parsed.data.id);

  if (error) {
    console.error("[blog] save post failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another post already uses that address.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  if (previousSlug && previousSlug !== row.slug) refreshPost(previousSlug);
  if (typeof row.slug === "string") refreshPost(row.slug);

  return { status: "success", message: "The public page is already showing it." };
}

/**
 * Duplicate a post.
 *
 * The copy is a draft at the first free `-copy` address, with the body carried
 * across — starting from a finished article is how a follow-up gets written.
 */
export async function duplicatePost(
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

  const { data: post } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!post) return { status: "error", message: "That post no longer exists." };

  const slugs = new Set((await getAdminPosts()).map((row) => row.slug));

  let slug = `${post.slug}-copy`;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${post.slug}-copy-${n}`;

  // Every column is named rather than spread, so `id`, `created_at`,
  // `published_at` and `view_count` cannot come across — the last two of which
  // would have a brand-new draft claiming a publication date and an audience.
  const { data: created, error } = await supabase
    .from("blog_posts")
    .insert({
      title: `${post.title} (copy)`,
      slug,
      status: "draft",
      is_featured: false,

      excerpt: post.excerpt,
      content: post.content,
      category_id: post.category_id,
      tags: post.tags,
      featured_image_id: post.featured_image_id,

      // The SEO fields deliberately do not come across. A duplicate that
      // inherits the original's title tag and canonical URL is two pages
      // telling search engines they are the same page.
      seo_keywords: [],
      og_image_id: post.og_image_id,
      noindex: post.noindex,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[blog] duplicate post failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refreshPost(slug);

  redirect(`/admin/blog?post=${created.id}`);
}

export async function deletePost(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const slug = await slugOf("blog_posts", parsed.data.id);
  const supabase = await createClient();

  const { error } = await supabase.from("blog_posts").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[blog] delete post failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  if (slug) refreshPost(slug);

  return { status: "success", message: "Deleted." };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the category a name.")
    .max(80, "That name is too long."),
  slug: z
    .string()
    .trim()
    .min(1, "Give the category an address.")
    .max(120, "That address is too long.")
    .regex(SLUG_PATTERN.re, SLUG_PATTERN.message),
});

export async function createCategory(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createCategorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const existing = await getAdminCategories();

  const { data, error } = await supabase
    .from("blog_categories")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      sort_order: Math.max(0, ...existing.map((row) => row.sort_order)) + 1,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[blog] create category failed:", error.message);
    return {
      status: "error",
      message:
        error.code === "23505" ? "A category already uses that address." : "Could not create it.",
      fieldErrors: error.code === "23505" ? { slug: "Already in use." } : undefined,
    };
  }

  await refreshCategory(null);

  redirect(`/admin/blog/categories?category=${data.id}`);
}

export async function saveCategory(
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

  const values = categorySchema().safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("blog_categories")
    .update(categoryValuesToRow(values.data as Record<string, unknown>))
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[blog] save category failed:", error.message);

    if (error.code === "23505") {
      return {
        status: "error",
        message: "Another category already uses that address.",
        fieldErrors: { slug: "Already in use." },
      };
    }

    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  await refreshCategory(parsed.data.id);

  return { status: "success", message: "Saved." };
}

export async function moveCategory(
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

  const { data: categories } = await supabase
    .from("blog_categories")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!categories) return { status: "error", message: "Could not read the list." };

  const index = categories.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= categories.length) {
    return { status: "error", message: "It is already at the end." };
  }

  const a = categories[index];
  const b = categories[target];

  const [first, second] = await Promise.all([
    supabase.from("blog_categories").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("blog_categories").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[blog] move category failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move it." };
  }

  await refreshCategory(null);

  return { status: "success", message: "Moved." };
}

export async function duplicateCategory(
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

  const { data: category } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!category) return { status: "error", message: "That category no longer exists." };

  const existing = await getAdminCategories();
  const slugs = new Set(existing.map((row) => row.slug));

  let slug = `${category.slug}-copy`;
  for (let n = 2; slugs.has(slug); n += 1) slug = `${category.slug}-copy-${n}`;

  const { data: created, error } = await supabase
    .from("blog_categories")
    .insert({
      name: `${category.name} (copy)`,
      slug,
      description: category.description,
      sort_order: Math.max(0, ...existing.map((row) => row.sort_order)) + 1,
      og_image_id: category.og_image_id,
      noindex: category.noindex,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[blog] duplicate category failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  await refreshCategory(null);

  redirect(`/admin/blog/categories?category=${created.id}`);
}

/**
 * Delete a category.
 *
 * The foreign key is `on delete set null`, so this does not delete the posts
 * filed under it — it uncategorises them. The confirmation says so and names
 * the number, which is why the list carries a post count at all.
 */
export async function deleteCategory(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  // Read the affected posts before the delete: afterwards the link is gone and
  // there is no way to find the pages whose breadcrumb has just changed.
  const affected = await postSlugsInCategory(parsed.data.id);

  const supabase = await createClient();
  const { error } = await supabase
    .from("blog_categories")
    .delete()
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[blog] delete category failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  updateTag(CACHE_TAGS.blog);
  for (const slug of affected) updateTag(CACHE_TAGS.post(slug));
  revalidatePath("/admin/blog/categories");
  revalidatePath("/admin/blog");

  return {
    status: "success",
    message:
      affected.length > 0
        ? `Deleted. ${affected.length} ${affected.length === 1 ? "post is" : "posts are"} now uncategorised.`
        : "Deleted.",
  };
}
