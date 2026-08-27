import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { PostImage } from "@/lib/queries/blog";
import type { Tables } from "@/types/database";

export type BlogPostRow = Tables<"blog_posts">;
export type BlogCategoryRow = Tables<"blog_categories">;

export interface PostSummaryRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  is_featured: boolean;
  published_at: string | null;
  reading_minutes: number | null;
  updated_at: string;
  category: { name: string } | null;
}

/**
 * Every post, drafts and archived ones included.
 *
 * Ordered as the public index orders them — newest publication first — except
 * that unpublished work comes to the top rather than the bottom. A post has no
 * position column, so this is the order, and the drafts are what the person
 * opening this screen came to finish.
 *
 * `content` is not read here. The body of every post would be several hundred
 * kilobytes of markdown to render a list of titles.
 */
export async function getAdminPosts(): Promise<PostSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      "id, slug, title, status, is_featured, published_at, reading_minutes, updated_at, category:blog_categories(name)",
    )
    .order("published_at", { ascending: false, nullsFirst: true });

  if (error) {
    console.error("[blog] admin post list failed:", error.message);
    return [];
  }

  return (data ?? []) as PostSummaryRow[];
}

/** One post with its category and image resolved, as the preview renders it. */
export interface AdminPost extends BlogPostRow {
  category: { slug: string; name: string } | null;
  image: PostImage | null;
}

export async function getAdminPost(id: string): Promise<AdminPost | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select(
      `*, category:blog_categories(slug, name),
       image:media!blog_posts_featured_image_id_fkey(public_url, alt_text, width, height)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[blog] admin post read failed for ${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  const { category, image, ...post } = data as BlogPostRow & {
    category: { slug: string; name: string } | null;
    image:
      | { public_url: string; alt_text: string; width: number | null; height: number | null }
      | null;
  };

  return {
    ...post,
    category: category ?? null,
    image: image
      ? { url: image.public_url, alt: image.alt_text, width: image.width, height: image.height }
      : null,
  };
}

export interface CategorySummaryRow {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  postCount: number;
}

/**
 * Every category, in the admin's order, with how many posts each holds.
 *
 * The count is what makes deleting one a decision rather than a guess: the
 * foreign key is `on delete set null`, so removing a category does not remove
 * its posts — it quietly uncategorises them.
 */
export async function getAdminCategories(): Promise<CategorySummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, slug, name, sort_order, blog_posts(id)")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[blog] admin category list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const { blog_posts: posts, ...category } = row as CategorySummaryRow & {
      blog_posts: { id: string }[];
    };
    return { ...category, postCount: posts?.length ?? 0 };
  });
}

export async function getAdminCategory(id: string): Promise<BlogCategoryRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_categories")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[blog] admin category read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}

/**
 * The categories a post may be filed under.
 *
 * Read here rather than exported from the actions file, because every export
 * from a `"use server"` module becomes a callable endpoint — and a list of
 * options is a read, not an action. The Server Action rebuilds it from this
 * same function before validating, so a category id that does not exist is
 * refused rather than written.
 */
export async function categoryOptions(): Promise<{ id: string; label: string }[]> {
  return (await getAdminCategories()).map((category) => ({
    id: category.id,
    label: category.name,
  }));
}

/** The slugs of every post in one category, for cache invalidation. */
export async function postSlugsInCategory(categoryId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug")
    .eq("category_id", categoryId);

  if (error) {
    console.error("[blog] category post slugs failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.slug);
}
