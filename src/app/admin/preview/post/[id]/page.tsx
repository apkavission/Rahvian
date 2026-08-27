import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostDetail } from "@/components/blog/post-detail";
import { requireMenu } from "@/lib/auth/session";
import { getAdminPost } from "@/lib/queries/blog-admin";
import { getBlogPosts } from "@/lib/queries/blog";

export const metadata: Metadata = {
  title: "Post preview",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A post as it will look, including what is not published yet.
 *
 * The same `PostDetail` the public route renders, which matters more here than
 * on any other screen: the body is markdown, and the only way to know how it
 * came out is to see it rendered by the renderer the site uses.
 *
 * The post itself is read uncached, as the signed-in user, which is what makes
 * a draft visible. The "keep reading" strip comes from the public, cached
 * query, because it should show only what a visitor would be shown.
 */
export default async function PostPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMenu("blog");

  const { id } = await params;
  const post = await getAdminPost(id);

  if (!post) notFound();

  const published = await getBlogPosts();

  const related = published
    .filter((other) => other.slug !== post.slug)
    .filter((other) => !post.category || other.category?.slug === post.category.slug)
    .slice(0, 3);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {post.title} · {post.status}
          {post.reading_minutes ? ` · ${post.reading_minutes} min read` : ""}
        </p>
      </div>

      <PostDetail post={post} related={related} />
    </div>
  );
}
