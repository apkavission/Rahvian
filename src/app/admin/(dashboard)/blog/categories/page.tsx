import Link from "next/link";
import type { Metadata } from "next";
import { requireMenu } from "@/lib/auth/session";
import { getAdminCategories, getAdminCategory } from "@/lib/queries/blog-admin";
import { categoryToValues } from "@/lib/records/blog";
import { CategoryEditor } from "./category-editor";
import { CategoryList } from "./category-list";
import { NewCategoryForm } from "./new-category-form";

export const metadata: Metadata = {
  title: "Blog categories",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Blog categories.
 *
 * **The first screen with two columns rather than three**, and the standing
 * rule says how that is done: where a record has no meaningful preview, the
 * third column is dropped and the first two keep their positions. The layout
 * narrows; it does not rearrange. A category is a name and a sentence with no
 * page of its own, so a preview would be showing the form back to the person
 * who just typed it.
 */
export default async function BlogCategoriesScreen({ searchParams }: Props) {
  await requireMenu("blog");

  const query = await searchParams;
  const requested = typeof query.category === "string" ? query.category : null;

  const categories = await getAdminCategories();

  const selectedId =
    categories.find((category) => category.id === requested)?.id ?? categories[0]?.id ?? null;

  const selected = selectedId ? await getAdminCategory(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
        <Link href="/admin/blog" className="text-text-subtle transition-colors hover:text-accent">
          Blog
        </Link>
      </nav>

      <header className="mt-6">
        <h1 className="font-display text-2xl font-semibold">Categories</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          How the archive is filtered, and what a post shows in its breadcrumb.
          Deleting one never deletes its posts — they become uncategorised.
        </p>
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Categories, in order
          </h2>
          <div className="mt-3">
            <CategoryList
              categories={categories.map((category) => ({
                id: category.id,
                slug: category.slug,
                name: category.name,
                postCount: category.postCount,
              }))}
              selectedId={selectedId}
            />
            <NewCategoryForm />
          </div>
        </div>

        <div className="min-w-0 xl:max-w-2xl">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the category, so selecting another one remounts the
                form rather than leaving the previous one's words in state.
              */}
              <CategoryEditor
                key={selected.id}
                id={selected.id}
                values={categoryToValues(selected)}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">No categories yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add one on the left and it will open here. A category appears on
                the site as soon as a published post uses it.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
