"use client";

import { Star } from "lucide-react";
import { RecordList } from "@/components/admin/record-list";
import { deletePost, duplicatePost } from "@/lib/actions/blog";

export interface PostListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  is_featured: boolean;
  category: string | null;
  reading_minutes: number | null;
}

/**
 * The left column: every post, newest publication first.
 *
 * No reorder arrows. `blog_posts` has no position column - the index is ordered
 * by publication date - and arrows that appear to do nothing are worse than no
 * arrows.
 *
 * The subtitle carries the category and the reading time, which together are
 * what tell two drafts apart in a list of titles.
 */
export function PostList({
  posts,
  selectedId,
}: {
  posts: PostListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/blog"
      queryKey="post"
      selectedId={selectedId}
      emptyLabel="No posts yet. Write the first one below."
      items={posts.map((post) => ({
        id: post.id,
        title: post.title,
        subtitle: [
          post.category ?? "Uncategorised",
          post.reading_minutes ? `${post.reading_minutes} min` : null,
          post.status === "published" ? null : post.status,
        ]
          .filter(Boolean)
          .join(" · "),
        dimmed: post.status !== "published",
        icon: post.is_featured ? (
          <Star className="size-4 fill-accent text-accent" aria-label="Featured" />
        ) : undefined,
      }))}
      actions={{
        duplicate: duplicatePost,
        remove: deletePost,
      }}
      deleteCopy={(item) => ({
        title: `Delete ${item.title}?`,
        body: "The post and everything written in it are removed and cannot be brought back. To take it off the site without losing the words, set its status to Archived instead.",
        confirmLabel: "Delete post",
      })}
    />
  );
}
