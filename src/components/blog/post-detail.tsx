import Link from "next/link";
import { PostBody } from "@/components/blog/post-body";
import { NaturalImage } from "@/components/media/image";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BlogPostCard, PostCategory, PostImage } from "@/lib/queries/blog";
import { collectHeadings, parseMarkdown } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

/**
 * One post, from a row.
 *
 * Lifted out of the public route so the admin's preview renders the same
 * component rather than a second version of it. A preview that only
 * approximates the page is worse than no preview, because it is trusted — and
 * for a markdown body that is the whole point of previewing at all.
 *
 * The body is markdown from the database, parsed into typed nodes and rendered
 * as React elements — never as injected HTML. An admin who pastes a copied
 * article cannot execute script or break the layout for every reader, which is
 * the only acceptable behaviour for content the admin panel can write.
 *
 * The contents list appears only for a post long enough to need one, and is
 * built from the same parse the body renders, so it can never name a heading
 * the article does not have.
 */
export interface PostDetailData {
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  tags: string[];
  published_at: string | null;
  reading_minutes: number | null;
  category: PostCategory | null;
  image: PostImage | null;
}

export function PostDetail({
  post,
  related,
}: {
  post: PostDetailData;
  related: BlogPostCard[];
}) {
  const headings = collectHeadings(parseMarkdown(post.content)).filter(
    (heading) => heading.level === 2,
  );

  const published = formatDate(post.published_at);

  return (
    <>
      <Section className="pt-14 md:pt-20">
        <Reveal className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
            <Link href="/blog" className="text-text-subtle transition-colors hover:text-accent">
              Blog
            </Link>
            {post.category && (
              <>
                <span className="mx-2 text-text-subtle" aria-hidden>
                  /
                </span>
                <span className="text-accent">{post.category.name}</span>
              </>
            )}
          </nav>

          <h1 className="mt-8 font-display text-3xl font-semibold leading-[1.12] sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-6 text-lg leading-relaxed text-text-muted">{post.excerpt}</p>
          )}

          <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-text-subtle">
            {[published, post.reading_minutes ? `${post.reading_minutes} min read` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Reveal>

        {post.image && (
          <Reveal className="mt-12">
            <NaturalImage
              image={post.image}
              eager
              className="rounded-2xl border border-border"
            />
          </Reveal>
        )}
      </Section>

      <Section className="pt-0">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,16rem)_1fr] lg:gap-20">
          {/* Three sections is where scrolling back to find one stops working. */}
          {headings.length >= 3 ? (
            <nav aria-label="Contents" className="lg:sticky lg:top-28 lg:self-start">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-text-subtle">
                Contents
              </p>
              <ol className="mt-5 space-y-2.5 border-l border-border pl-5">
                {headings.map((heading) => (
                  <li key={heading.id}>
                    <a
                      href={`#${heading.id}`}
                      className="text-sm leading-snug text-text-muted transition-colors duration-[--duration-fast] hover:text-accent"
                    >
                      {heading.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : (
            <div aria-hidden />
          )}

          <article>
            <PostBody markdown={post.content} />

            {post.tags.length > 0 && (
              <ul className="mt-14 flex flex-wrap gap-2 border-t border-border pt-8">
                {post.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      </Section>

      {related.length > 0 && (
        <Section background="muted">
          <SectionHeading eyebrow="Keep reading" title="More on this" />
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other) => (
              <RelatedCard key={other.id} post={other} />
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function RelatedCard({ post }: { post: BlogPostCard }) {
  const meta = [
    formatDate(post.published_at),
    post.reading_minutes ? `${post.reading_minutes} min read` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Reveal as="li" className="h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="surface-raised group flex h-full flex-col rounded-2xl border border-border p-6 transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
      >
        {post.category && (
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
            {post.category.name}
          </p>
        )}
        <h3 className="mt-3 font-display text-lg font-semibold leading-snug">{post.title}</h3>
        {post.excerpt && (
          <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">{post.excerpt}</p>
        )}
        {meta && (
          <p className="mt-5 border-t border-border pt-4 font-mono text-xs text-text-subtle">
            {meta}
          </p>
        )}
      </Link>
    </Reveal>
  );
}
