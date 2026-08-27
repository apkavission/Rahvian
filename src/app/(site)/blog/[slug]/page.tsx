import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostDetail } from "@/components/blog/post-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { getBlogPost, getBlogPosts } from "@/lib/queries/blog";
import { buildMetadata } from "@/lib/seo";
import { buildArticleSchema, buildBreadcrumbSchema } from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

/**
 * Prerender every published post.
 *
 * `dynamicParams` stays at its default of true, so a post published from the
 * admin between deploys is served on first request rather than 404ing until
 * someone redeploys.
 */
export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) {
    return buildMetadata({ title: "Not found", path: `/blog/${slug}`, noindex: true });
  }

  return buildMetadata({
    title: post.seo_title ?? post.title,
    description: post.seo_description ?? post.excerpt,
    path: `/blog/${post.slug}`,
    keywords: post.seo_keywords,
    noindex: post.noindex,
    canonical: post.canonical_url,
  });
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  // RLS restricts this read to published rows, so a draft slug lands here too.
  if (!post) notFound();

  const all = await getBlogPosts();

  const related = all
    .filter((other) => other.slug !== post.slug)
    .filter((other) => !post.category || other.category?.slug === post.category.slug)
    .slice(0, 3);

  const path = `/blog/${post.slug}`;

  return (
    <>
      <JsonLd data={buildArticleSchema(post, path)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Blog", path: "/blog" },
          { name: post.title, path },
        ])}
      />

      {/*
        The page itself is a component, shared with the admin's preview. The two
        routes differ in how they read — cached and anonymous here, uncached and
        as the signed-in user there, so a draft can be looked at — and in nothing
        else.
      */}
      <PostDetail post={post} related={related} />
    </>
  );
}
