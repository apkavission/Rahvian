import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PostCard, postMeta } from "@/components/blog/post-card";
import { FramedImage } from "@/components/media/image";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import { getBlogPosts } from "@/lib/queries/blog";
import type { BlogPostCard } from "@/lib/queries/blog";

export interface BlogListContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Cap the number shown, for a "latest writing" block on another page. */
  limit?: number;
  /** Give the newest featured post the wide card at the top. */
  showFeatured?: boolean;
  /** Shown in place of the list when nothing is published. */
  empty?: {
    heading: string;
    body: string;
    cta?: { label: string; href: string };
  };
  /** Link under the list, e.g. to the full archive. */
  more?: { label: string; href: string };
  background?: BackgroundVariant;
}

/**
 * The post list, read live from `blog_posts`.
 *
 * Nothing here is written by a developer: a post is a row, and this section
 * carries only the heading above it and the copy shown while the archive is
 * empty. That empty state is content rather than a placeholder — a company
 * that has published nothing yet should say so plainly instead of shipping
 * three filler articles.
 */
export async function BlogList({ content }: { content: BlogListContent }) {
  const all = await getBlogPosts();

  const featured = content.showFeatured
    ? (all.find((post) => post.is_featured) ?? null)
    : null;

  const rest = all.filter((post) => post.id !== featured?.id);
  const posts = content.limit ? rest.slice(0, content.limit) : rest;

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      {all.length > 0 ? (
        <>
          {featured && <FeaturedCard post={featured} />}

          {posts.length > 0 && (
            <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </ul>
          )}

          {content.more && (
            <Reveal>
              <div className="mt-10">
                <ButtonLink href={content.more.href} variant="secondary" className="group">
                  {content.more.label}
                  <ArrowRight
                    className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </ButtonLink>
              </div>
            </Reveal>
          )}
        </>
      ) : content.empty ? (
        <Reveal>
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface-2/40 p-8 md:p-12">
            <h3 className="font-display text-xl font-semibold">{content.empty.heading}</h3>
            <p className="measure mt-3 leading-relaxed text-text-muted">{content.empty.body}</p>
            {content.empty.cta && (
              <div className="mt-7">
                <ButtonLink href={content.empty.cta.href} className="group">
                  {content.empty.cta.label}
                  <ArrowRight
                    className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </ButtonLink>
              </div>
            )}
          </div>
        </Reveal>
      ) : null}
    </Section>
  );
}

function FeaturedCard({ post }: { post: BlogPostCard }) {
  return (
    <Reveal className="mt-14">
      <Link
        href={`/blog/${post.slug}`}
        className="surface-raised group grid overflow-hidden rounded-3xl border border-border transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong lg:grid-cols-[1.1fr_1fr]"
      >
        <div className="p-8 md:p-12">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">Featured</p>
          <h3 className="mt-5 font-display text-2xl font-semibold leading-snug sm:text-3xl">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="measure mt-4 leading-relaxed text-text-muted">{post.excerpt}</p>
          )}
          <p className="mt-7 font-mono text-xs text-text-subtle">{postMeta(post)}</p>
        </div>

        {post.image ? (
          <FramedImage
            image={post.image}
            eager
            className="order-first aspect-[16/10] border-b border-border lg:order-last lg:aspect-auto lg:border-b-0 lg:border-l"
          />
        ) : (
          <div
            aria-hidden
            className="order-first aspect-[16/10] border-b border-border bg-surface-2 opacity-40 [background:repeating-linear-gradient(135deg,var(--border)_0_1px,transparent_1px_10px)] lg:order-last lg:aspect-auto lg:border-b-0 lg:border-l"
          />
        )}
      </Link>
    </Reveal>
  );
}
