import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { getAdminPage } from "@/lib/queries/pages-admin";
import { PreviewPane } from "@/components/admin/preview-pane";
import { PageMetaForm } from "./page-meta-form";
import { SectionEditor } from "./section-editor";
import { SectionList } from "./section-list";
import { publicPathFor } from "@/lib/content/slugs";

export const metadata: Metadata = {
  title: "Edit page",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The page builder.
 *
 * Sections on the left, the selected section's form on the right, the page's
 * own fields underneath. Which section is being edited lives in the query
 * string rather than in component state, so the browser's back button steps
 * back through what was being edited and a link to one section is a link
 * someone can send.
 */
export default async function PageBuilder({ params, searchParams }: Props) {
  await requireMenu("pages");

  const { id } = await params;
  const query = await searchParams;
  const result = await getAdminPage(id);

  if (!result) notFound();

  const { page, sections } = result;

  const requested = typeof query.section === "string" ? query.section : null;
  const selected =
    sections.find((section) => section.id === requested) ?? sections[0] ?? null;

  const publicPath = publicPathFor(page);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
        <Link href="/admin/pages" className="text-text-subtle transition-colors hover:text-accent">
          Pages
        </Link>
      </nav>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">{page.title}</h1>
          <p className="mt-1.5 font-mono text-xs text-text-subtle">
            {publicPath} · {page.status}
          </p>
        </div>

        {page.status === "published" && (
          <a
            href={publicPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            View on the site
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)] xl:gap-8">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Sections, in order
          </h2>
          <div className="mt-3">
            <SectionList
              pageId={page.id}
              sections={sections.map((section) => ({
                id: section.id,
                type: section.type,
                is_active: section.is_active,
              }))}
              selectedId={selected?.id ?? null}
            />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the section, so switching between two sections of the
                same type remounts the form. Without it React would reuse the
                component and keep the first section's content in state — the
                editor would show one section's words under another's name.
              */}
              <SectionEditor
                key={selected.id}
                pageId={page.id}
                section={{
                  id: selected.id,
                  type: selected.type,
                  background_variant: selected.background_variant,
                  content: selected.content,
                }}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">Nothing to edit yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add a section on the left and it will open here. New sections
                start hidden, so nothing half-written reaches the live page.
              </p>
            </div>
          )}

          <section
            aria-labelledby="page-meta"
            className="surface-raised mt-8 rounded-2xl border border-border p-6"
          >
            <h2 id="page-meta" className="font-display text-lg font-semibold">
              Page settings
            </h2>
            <p className="mt-1.5 text-sm text-text-muted">
              The title, the address and what search engines are told about it.
            </p>

            <div className="mt-6">
              <PageMetaForm
                values={{
                  id: page.id,
                  title: page.title,
                  slug: page.slug,
                  status: page.status,
                  is_system: page.is_system,
                  seo_title: page.seo_title ?? "",
                  seo_description: page.seo_description ?? "",
                  canonical_url: page.canonical_url ?? "",
                  schema_type: page.schema_type ?? "",
                  noindex: page.noindex,
                }}
              />
            </div>
          </section>
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          Three columns from `xl` up and stacked below it: at 1280 the editor
          and a readable preview do not both fit, and a preview squeezed into
          300px tells you nothing about how the page reads.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <PreviewPane
            path={`/admin/preview/${page.id}`}
            note="Updates when you save. Hidden sections are left out, exactly as the live page leaves them out."
          />
        </div>
      </div>
    </div>
  );
}
