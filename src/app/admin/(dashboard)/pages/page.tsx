import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { getAdminPages } from "@/lib/queries/pages-admin";
import { formatDate } from "@/lib/utils";
import { NewPageForm } from "./new-page-form";

export const metadata: Metadata = {
  title: "Pages",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Every page on the site.
 *
 * Drafts included — RLS lets staff see them and the public query cannot. A
 * page marked "system" has a route in the code that reads it by slug, which is
 * why the database refuses to delete one and the builder refuses to rename it.
 */
export default async function PagesIndex() {
  await requireMenu("pages");
  const pages = await getAdminPages();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Pages</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
            Every page is a list of sections, and every section is a row. Reorder
            them, hide one, change any word in it — the public page follows within
            seconds, with no deploy in between.
          </p>
        </div>

        <NewPageForm />
      </header>

      {pages.length > 0 ? (
        <ul className="mt-10 space-y-3">
          {pages.map((page) => (
            <li key={page.id}>
              <div className="surface-raised flex flex-wrap items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-border-strong">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="font-medium transition-colors hover:text-accent"
                    >
                      {page.title}
                    </Link>
                    {page.status !== "published" && (
                      <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-text-subtle">
                        {page.status}
                      </span>
                    )}
                    {page.is_system && (
                      <span
                        title="A route in the code reads this page by its slug."
                        className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-text-subtle"
                      >
                        System
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-mono text-xs text-text-subtle">
                    /{page.slug} · {page.sectionCount}{" "}
                    {page.sectionCount === 1 ? "section" : "sections"} · edited{" "}
                    {formatDate(page.updated_at)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {page.status === "published" && (
                    <a
                      href={page.slug === "home" ? "/" : `/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${page.title} on the site`}
                      title="Open on the site"
                      className="grid size-9 place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface-2 hover:text-accent"
                    >
                      <ExternalLink className="size-4" aria-hidden />
                    </a>
                  )}
                  <Link
                    href={`/admin/pages/${page.id}`}
                    aria-label={`Edit ${page.title}`}
                    className="grid size-9 place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface-2 hover:text-accent"
                  >
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
          <h2 className="font-display text-lg font-semibold">No pages yet</h2>
          <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
            The seed script creates the pages every route in the code expects.
            Run <code className="font-mono text-xs">npm run db:seed</code> if
            this is a fresh database.
          </p>
        </div>
      )}
    </div>
  );
}
