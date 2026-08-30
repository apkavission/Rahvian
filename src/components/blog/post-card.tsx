import Link from "next/link";
import { FramedImage } from "@/components/media/image";
import { Reveal } from "@/components/motion/reveal";
import type { BlogPostCard } from "@/lib/queries/blog";
import { formatDate } from "@/lib/utils";

/**
 * One post, as a card.
 *
 * Extracted from the `blog_list` section on 2026-08-28, when the category
 * archive at `/blog/category/[slug]` needed the same card. It is the same
 * extraction the portfolio and case-study cards went through, and for the same
 * reason: two grids of posts that were *nearly* identical would drift, and the
 * one that drifted would be the archive nobody opens as often as the index.
 */

/** Meta line: date, reading time, category. Shared by both cards. */
export function postMeta(post: BlogPostCard): string {
  return [
    formatDate(post.published_at),
    post.reading_minutes ? `${post.reading_minutes} min read` : null,
    post.category?.name,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * The heading level the card's title renders at.
 *
 * Not the card's decision to make. On `/blog` the grid sits under an `h2`
 * ("Latest posts"), so `h3` is the right level; on a category archive the page
 * heading *is* the `h1` and there is nothing between it and the cards, so `h3`
 * skips a level.
 *
 * That skip was live and invisible until 2026-08-28, because every category was
 * empty — the accessibility spec walked a page with no cards on it and found
 * nothing to be wrong. It failed within minutes of the first post being
 * published from the admin panel, which is the whole argument for filling a
 * site with real content before calling it checked.
 */
export function PostCard({
  post,
  as: Heading = "h3",
}: {
  post: BlogPostCard;
  as?: "h2" | "h3";
}) {
  return (
    <Reveal as="li" className="h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="surface-raised group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
      >
        {post.image ? (
          <FramedImage
            image={post.image}
            className="aspect-[16/10] border-b border-border"
          />
        ) : (
          <div
            aria-hidden
            className="aspect-[16/10] border-b border-border bg-surface-2 opacity-40 [background:repeating-linear-gradient(135deg,var(--border)_0_1px,transparent_1px_10px)]"
          />
        )}

        <div className="flex flex-1 flex-col p-6">
          {post.category && (
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
              {post.category.name}
            </p>
          )}
          <Heading className="mt-3 font-display text-lg font-semibold leading-snug">
            {post.title}
          </Heading>
          {post.excerpt && (
            <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">{post.excerpt}</p>
          )}
          <p className="mt-5 border-t border-border pt-4 font-mono text-xs text-text-subtle">
            {postMeta(post)}
          </p>
        </div>
      </Link>
    </Reveal>
  );
}
