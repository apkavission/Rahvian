"use client";

import { RecordList } from "@/components/admin/record-list";
import {
  deleteCategory,
  duplicateCategory,
  moveCategory,
} from "@/lib/actions/blog";

export interface CategoryListItem {
  id: string;
  slug: string;
  name: string;
  postCount: number;
}

/**
 * The left column: every blog category, in the order the archive filter shows
 * them.
 *
 * The subtitle is the post count, and it is there for the delete dialog's sake:
 * the foreign key is `on delete set null`, so removing a category does not
 * remove its posts - it quietly uncategorises them, and the number is what
 * makes that a decision rather than a surprise.
 */
export function CategoryList({
  categories,
  selectedId,
}: {
  categories: CategoryListItem[];
  selectedId: string | null;
}) {
  return (
    <RecordList
      basePath="/admin/blog/categories"
      queryKey="category"
      selectedId={selectedId}
      emptyLabel="No categories yet. Add the first one below."
      items={categories.map((category) => ({
        id: category.id,
        title: category.name,
        subtitle:
          category.postCount === 1 ? "1 post" : `${category.postCount} posts`,
        dimmed: category.postCount === 0,
      }))}
      actions={{
        move: moveCategory,
        duplicate: duplicateCategory,
        remove: deleteCategory,
      }}
      deleteCopy={(item) => ({
        title: `Delete ${item.title}?`,
        body: `The posts filed under it are not deleted - they become uncategorised, and you would have to file each one again. This affects ${item.subtitle}.`,
        confirmLabel: "Delete category",
      })}
    />
  );
}
