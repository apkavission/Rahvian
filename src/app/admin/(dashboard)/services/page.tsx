import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PreviewPane } from "@/components/admin/preview-pane";
import { requireMenu } from "@/lib/auth/session";
import { getAdminService, getAdminServices } from "@/lib/queries/services-admin";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { getAdminTechnologies } from "@/lib/queries/technologies";
import { serviceToValues } from "@/lib/records/services";
import { NewServiceForm } from "./new-service-form";
import { ServiceEditor } from "./service-editor";
import { ServiceList } from "./service-list";

export const metadata: Metadata = {
  title: "Services",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The services screen.
 *
 * The first of the content lists, and therefore the one that decides how the
 * other six look: the list on the left in the order visitors see, the selected
 * record as a form in the middle, and the real page beside it on the right.
 * Portfolio, case studies, blog, pricing, FAQs and team are this screen again
 * with different descriptors — which is why almost everything on it lives in
 * `components/admin` rather than here.
 *
 * Which service is being edited is in the query string rather than in component
 * state, so the back button steps back through what was being edited and a link
 * to one service is a link someone can send.
 */
export default async function ServicesScreen({ searchParams }: Props) {
  await requireMenu("services");

  const query = await searchParams;
  const requested = typeof query.service === "string" ? query.service : null;

  const [services, technologies, assets] = await Promise.all([
    getAdminServices(),
    getAdminTechnologies(),
    getMediaOptions(),
  ]);

  const selectedId =
    services.find((service) => service.id === requested)?.id ?? services[0]?.id ?? null;

  // Read in full only once one is selected — the list carries the columns it
  // needs, and the form needs all twenty-odd of them for exactly one row.
  const selected = selectedId ? await getAdminService(selectedId) : null;

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Services</h1>
          <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
            Each one is a page, a card on the services grid, an entry in the
            navigation and a line in the sitemap. Publish an eighth and it
            appears in all four, with no deploy in between.
          </p>
        </div>

        {selected?.status === "published" && (
          <a
            href={`/services/${selected.slug}`}
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
            Services, in order
          </h2>
          <div className="mt-3">
            <ServiceList
              services={services.map((service) => ({
                id: service.id,
                slug: service.slug,
                name: service.name,
                icon: service.icon,
                status: service.status,
              }))}
              selectedId={selectedId}
            />
            <NewServiceForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the service, so selecting another one remounts the
                form. Without it React would reuse the component and keep the
                first service's words in state — the editor would show one
                service's copy under another's name.
              */}
              <ServiceEditor
                key={selected.id}
                id={selected.id}
                values={serviceToValues(selected)}
                technologies={technologies}
                assets={assets}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">No services yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Create one on the left and it will open here. New services start
                as drafts, so nothing half-written reaches the site.
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
              path={`/admin/preview/service/${selected.id}`}
              note="Updates when you save. Drafts render here and nowhere else."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
