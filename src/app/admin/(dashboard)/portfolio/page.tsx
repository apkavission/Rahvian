import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { getAdminProject, getAdminProjects } from "@/lib/queries/projects-admin";
import { getAdminServices } from "@/lib/queries/services-admin";
import { getAdminTechnologies } from "@/lib/queries/technologies";
import { projectToValues } from "@/lib/records/projects";
import { NewProjectForm } from "./new-project-form";
import { ProjectEditor } from "./project-editor";
import { ProjectList } from "./project-list";

export const metadata: Metadata = {
  title: "Portfolio",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The portfolio screen.
 *
 * The same three columns as services, from the same components — the list, the
 * record form and the preview pane are shared, and this file supplies the
 * queries and the words. That is the point of having built services first.
 *
 * Which item is being edited is in the query string rather than in component
 * state, so the back button steps back through what was being edited and a link
 * to one item is a link someone can send.
 */
export default async function PortfolioScreen({ searchParams }: Props) {
  await requireMenu("portfolio");

  const query = await searchParams;
  const requested = typeof query.project === "string" ? query.project : null;

  const [projects, technologies, services, assets] = await Promise.all([
    getAdminProjects(),
    getAdminTechnologies(),
    getAdminServices(),
    getMediaOptions(),
  ]);

  const selectedId =
    projects.find((project) => project.id === requested)?.id ?? projects[0]?.id ?? null;

  // Read in full only once one is selected — the list carries the columns it
  // needs, and the form needs all thirty of them for exactly one row.
  const selected = selectedId ? await getAdminProject(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Portfolio</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
            Client work, self-built demos, our own products and earlier work —
            kept permanently distinct, because a visitor should never have to
            guess which one they are looking at.
          </p>
        </div>

        {selected?.status === "published" && (
          <a
            href={`/portfolio/${selected.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            View on the site
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </header>

      <div className="mt-10 grid gap-8 xl:grid-cols-[17rem_minmax(0,1fr)_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Portfolio, in order
          </h2>
          <div className="mt-3">
            <ProjectList
              projects={projects.map((project) => ({
                id: project.id,
                slug: project.slug,
                title: project.title,
                type: project.type,
                status: project.status,
                is_featured: project.is_featured,
              }))}
              selectedId={selectedId}
            />
            <NewProjectForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <>
              <div className="surface-raised rounded-2xl border border-border p-6">
                {/*
                  Keyed on the item, so selecting another one remounts the form.
                  Without it React would reuse the component and keep the first
                  item's words in state — the editor would show one project's
                  write-up under another's title.
                */}
                <ProjectEditor
                  key={selected.id}
                  id={selected.id}
                  values={projectToValues(selected)}
                  technologies={technologies}
                  services={services}
                  assets={assets}
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">Nothing here yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Add an item on the left and it will open here. New items start as
                drafts, so nothing half-written reaches the site.
              </p>
            </div>
          )}
        </div>

        {/*
          The preview, beside the form rather than behind a link.

          Three columns from `xl` up and stacked below it: at 1280 the form and
          a readable preview do not both fit, and a preview squeezed into 300px
          tells you nothing about how the page reads.
        */}
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          {selected ? (
            <PreviewPane
              path={`/admin/preview/project/${selected.id}`}
              note="Updates when you save. Drafts render here and nowhere else."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
