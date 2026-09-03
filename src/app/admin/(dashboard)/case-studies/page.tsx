import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import {
  caseStudyPickers,
  getAdminCaseStudies,
  getAdminCaseStudy,
} from "@/lib/queries/case-studies-admin";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { caseStudyToValues } from "@/lib/records/case-studies";
import { NewStudyForm } from "./new-study-form";
import { StudyEditor } from "./study-editor";
import { StudyList } from "./study-list";

export const metadata: Metadata = {
  title: "Case studies",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The case studies screen.
 *
 * The same three columns as services and portfolio, from the same components.
 * What is written here is the queries and the words.
 *
 * Which study is being edited is in the query string rather than in component
 * state, so the back button steps back through what was being edited and a link
 * to one study is a link someone can send.
 */
export default async function CaseStudiesScreen({ searchParams }: Props) {
  await requireMenu("case-studies");

  const query = await searchParams;
  const requested = typeof query.study === "string" ? query.study : null;

  const [studies, pickers, assets] = await Promise.all([
    getAdminCaseStudies(),
    caseStudyPickers(),
    getMediaOptions(),
  ]);

  const selectedId =
    studies.find((study) => study.id === requested)?.id ?? studies[0]?.id ?? null;

  // Read in full only once one is selected — the list carries the columns it
  // needs, and the form needs all of them for exactly one row.
  const selected = selectedId ? await getAdminCaseStudy(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Case studies</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
            The long version of a piece of work: what needed solving, what was
            built, and what changed afterwards. Every part of it is optional
            except the title — a write-up with no measured outcome is still
            worth publishing.
          </p>
        </div>

        {selected?.status === "published" && (
          <a
            href={`/case-studies/${selected.slug}`}
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
        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            Newest first
          </h2>
          <div className="mt-3">
            <StudyList
              studies={studies.map((study) => ({
                id: study.id,
                slug: study.slug,
                title: study.title,
                client_name: study.client_name,
                industry: study.industry,
                status: study.status,
              }))}
              selectedId={selectedId}
            />
            <NewStudyForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <>
              <div className="surface-raised rounded-2xl border border-border p-6">
                {/*
                  Keyed on the study, so selecting another one remounts the
                  form. Without it React would reuse the component and keep the
                  first study's words in state — the editor would show one
                  write-up under another's title.
                */}
                <StudyEditor
                  key={selected.id}
                  id={selected.id}
                  values={caseStudyToValues(selected)}
                  technologies={pickers.technologies}
                  projects={pickers.projects}
                  testimonials={pickers.testimonials}
                  assets={assets}
                />
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">Nothing written up yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Start one on the left and it will open here. New case studies
                start as drafts, so nothing half-written reaches the site.
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
              path={`/admin/preview/case-study/${selected.id}`}
              note="Updates when you save. Drafts render here and nowhere else."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
