import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/blog/post-card";
import { Section, SectionHeading } from "@/components/sections/section";
import { JsonLd } from "@/components/seo/json-ld";
import { getBlogCategories, getBlogPosts } from "@/lib/queries/blog";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema } from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

/**
 * One category's archive.
 *
 * In the specification's route list from the start and built on 2026-08-28.
 * It was left until now for an honest reason — nothing is published yet, so
 * every one of these pages is empty today — and built anyway for a better one:
 * the moment a post exists, the category on it is a link a reader will follow,
 * and a route that appears the week after the writing does is a route that
 * ships broken.
 *
 * **It reads the same two cached queries the blog index does** and filters in
 * memory rather than asking the database for a third list. The whole post list
 * is one cached read, this site will not have thousands of posts, and — the
 * part that matters — the index and the archive can then never disagree about
 * which posts are published.
 */

async function findCategory(slug: string) {
  const categories = await getBlogCategories();
  return categories.find((category) => category.slug === slug) ?? null;
}

/**
 * Every category, prerendered.
 *
 * `dynamicParams` is left at its default, so a category added from the admin
 * between deploys renders on first request rather than 404ing until somebody
 * redeploys — the same decision the service and post routes made.
 */
export async function generateStaticParams() {
  const categories = await getBlogCategories();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await findCategory(slug);

  if (!category) {
    return buildMetadata({
      title: "Not found",
      path: `/blog/category/${slug}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: category.seo_title ?? category.name,
    description: category.seo_description ?? category.description,
    path: `/blog/category/${category.slug}`,
    canonical: null,
  });
}

export default async function BlogCategoryPage({ params }: Params) {
  const { slug } = await params;

  const [category, posts] = await Promise.all([findCategory(slug), getBlogPosts()]);

  if (!category) notFound();

  const inCategory = posts.filter((post) => post.category?.slug === category.slug);

  return (
    <>
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: category.name, path: `/blog/category/${category.slug}` },
        ])}
      />

      <Section>
        <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-text-subtle transition-colors hover:text-text"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All writing
          </Link>
        </nav>

        <div className="mt-8">
          {/* The page's own heading, so this document has exactly one h1 —
              everywhere else on the site a SectionHeading sits under one. */}
          <SectionHeading
            as="h1"
            eyebrow="Category"
            title={category.name}
            description={category.description ?? undefined}
          />
        </div>

        {inCategory.length > 0 ? (
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {inCategory.map((post) => (
              <PostCard key={post.id} post={post} as="h2" />
            ))}
          </ul>
        ) : (
          /*
            Said plainly rather than shown as an empty grid.

            Every category is empty today, and a category that has nothing in it
            is a normal state rather than an error — a company writes about one
            subject for a while before it writes about the next.
          */
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface-2/40 p-8 md:p-12">
            <h2 className="font-display text-xl font-semibold">Nothing here yet</h2>
            <p className="measure mt-3 leading-relaxed text-text-muted">
              There is nothing published under {category.name} at the moment.
              Everything else we have written is on the{" "}
              <Link href="/blog" className="text-accent underline underline-offset-4">
                blog
              </Link>
              .
            </p>
          </div>
        )}
      </Section>
    </>
  );
}
