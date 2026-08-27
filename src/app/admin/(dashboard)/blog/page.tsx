import Link from "next/link";
import type { Metadata } from "next";
import { ExternalLink, Tag } from "lucide-react";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import {
  categoryOptions,
  getAdminPost,
  getAdminPosts,
} from "@/lib/queries/blog-admin";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { postToValues } from "@/lib/records/blog";
import { NewPostForm } from "./new-post-form";
import { PostEditor } from "./post-editor";
import { PostList } from "./post-list";

export const metadata: Metadata = {
  title: "Blog",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The blog screen.
 *
 * The same three columns as the other content lists. The preview earns its
 * place here more than anywhere else on the panel: the body is markdown, and
 * the only way to know how a heading, a list or a code block came out is to see
 * it rendered by the renderer the site actually uses.
 *
 * Categories are their own screen, linked from the header. They are a handful
 * of short records with no page of their own, and putting them in a second tab
 * here would have been a second shape on one screen.
 */
export default async function BlogScreen({ searchParams }: Props) {
  await requireMenu("blog");

  const query = await searchParams;
  const requested = typeof query.post === "string" ? query.post : null;

  const [posts, categories, assets] = await Promise.all([
    getAdminPosts(),
    categoryOptions(),
    getMediaOptions(),
  ]);

  const selectedId = posts.find((post) => post.id === requested)?.id ?? posts[0]?.id ?? null;

  // Read in full only once one is selected — the list deliberately does not
  // carry `content`, which for a long archive would be megabytes of markdown.
  const selected = selectedId ? await getAdminPost(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Blog</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
            Written in markdown and rendered as elements, never as raw HTML — so
            a pasted article cannot run script or break the page for readers.
            Reading time is worked out from the body on every save.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/blog/categories"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            <Tag className="size-4" aria-hidden />
            Categories
          </Link>

          {selected?.status === "published" && (
            <a
              href={`/blog/${selected.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
            >
              View on the site
              <ExternalLink className="size-4" aria-hidden />
            </a>
          )}
        </div>
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Newest first
          </h2>
          <div className="mt-3">
            <PostList
              posts={posts.map((post) => ({
                id: post.id,
                slug: post.slug,
                title: post.title,
                status: post.status,
                is_featured: post.is_featured,
                category: post.category?.name ?? null,
                reading_minutes: post.reading_minutes,
              }))}
              selectedId={selectedId}
            />
            <NewPostForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <>
              <div className="surface-raised rounded-2xl border border-border p-6">
                {/*
                  Keyed on the post, so selecting another one remounts the form.
                  Without it React would reuse the component and keep the first
                  post's body in state — the editor would show one article under
                  another's title.
                */}
                <PostEditor
                  key={selected.id}
                  id={selected.id}
                  values={postToValues(selected)}
                  categories={categories}
                  assets={assets}
                />
              </div>

            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">Nothing written yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Start a post on the left and it will open here. New posts start
                as drafts with an empty body, so nothing half-written reaches the
                site.
              </p>
            </div>
          )}
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          Three columns from `xl` up and stacked below it: at 1280 the form and
          a readable preview do not both fit, and a preview squeezed into 300px
          tells you nothing about how an article reads.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          {selected ? (
            <PreviewPane
              path={`/admin/preview/post/${selected.id}`}
              note="Updates when you save. This is the real markdown renderer, so what you see here is what a reader gets."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
