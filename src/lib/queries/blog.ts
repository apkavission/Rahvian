import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type BlogPost = Tables<"blog_posts">;
export type BlogCategory = Tables<"blog_categories">;

export interface PostImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface PostCategory {
  slug: string;
  name: string;
}

/**
 * Columns a card needs. `content` is deliberately absent — the body of every
 * post on the index would be several hundred kilobytes of markdown nobody
 * reads there.
 */
const CARD_COLUMNS = `
  id, slug, title, excerpt, tags, published_at, reading_minutes, is_featured,
  category:blog_categories(slug, name),
  image:media!blog_posts_featured_image_id_fkey(public_url, alt_text, width, height)
`;

export interface BlogPostCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  published_at: string | null;
  reading_minutes: number | null;
  is_featured: boolean;
  category: PostCategory | null;
  image: PostImage | null;
}

export interface BlogPostDetail extends BlogPost {
  category: PostCategory | null;
  image: PostImage | null;
}

/**
 * Every published post, newest first.
 *
 * The author is not read here. `profiles` is closed to the anonymous role by
 * design — a byline would embed as null on the public site and read as a bug.
 * Posts are published under the company's name until there is a public-safe
 * source for an author, which is what `team_members` will become.
 */
export const getBlogPosts = unstable_cache(
  async (): Promise<BlogPostCard[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("blog_posts")
      .select(CARD_COLUMNS)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[blog] list failed:", error.message);
      return [];
    }

    return (data ?? []).map(
      (row) =>
        ({
          ...row,
          category: toCategory(row.category),
          image: toImage(row.image),
        }) as BlogPostCard,
    );
  },
  ["blog-posts"],
  { tags: [CACHE_TAGS.blog] },
);

/**
 * One post, in full.
 *
 * Slug-scoped key and tag, so editing one post does not evict the rest of the
 * archive.
 */
export function getBlogPost(slug: string) {
  return unstable_cache(
    async (): Promise<BlogPostDetail | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          `*, category:blog_categories(slug, name),
           image:media!blog_posts_featured_image_id_fkey(public_url, alt_text, width, height)`,
        )
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(`[blog] read failed for "${slug}":`, error.message);
        return null;
      }
      if (!data) return null;

      return {
        ...data,
        category: toCategory(data.category),
        image: toImage(data.image),
      } as BlogPostDetail;
    },
    ["blog-post", slug],
    { tags: [CACHE_TAGS.blog, CACHE_TAGS.post(slug)] },
  )();
}

/**
 * Every category, in the admin's order.
 *
 * Categories are readable whether or not they hold a published post, so the
 * caller filters against the post list rather than showing a filter that
 * leads to an empty archive.
 */
export const getBlogCategories = unstable_cache(
  async (): Promise<BlogCategory[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("blog_categories")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[blog] categories failed:", error.message);
      return [];
    }

    return data ?? [];
  },
  ["blog-categories"],
  { tags: [CACHE_TAGS.blog] },
);

type EmbeddedMedia =
  | { public_url: string; alt_text: string; width: number | null; height: number | null }
  | null
  | undefined;

function toImage(row: unknown): PostImage | null {
  const media = row as EmbeddedMedia;
  if (!media) return null;
  return {
    url: media.public_url,
    alt: media.alt_text,
    width: media.width,
    height: media.height,
  };
}

function toCategory(row: unknown): PostCategory | null {
  const category = row as { slug: string; name: string } | null | undefined;
  if (!category) return null;
  return { slug: category.slug, name: category.name };
}
