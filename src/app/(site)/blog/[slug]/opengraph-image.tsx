import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getBlogPost } from "@/lib/queries/blog";
import { SITE_URL } from "@/lib/env";

export const alt = "Blog — Rahvian";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * One card per post, carrying the post's own title and excerpt.
 *
 * The eyebrow names the category when the post has one, so a shared link says
 * what kind of writing it is before anyone opens it.
 */
export default async function PostOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [post, logoDataUri] = await Promise.all([getBlogPost(slug), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow={post?.category?.name ?? "Blog"}
        title={post?.title ?? "Blog"}
        description={post?.seo_description ?? post?.excerpt}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
