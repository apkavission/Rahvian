import type { Metadata } from "next";
import { requireMenu } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import {
  getAdminTestimonial,
  getAdminTestimonials,
  getProjectOptions,
} from "@/lib/queries/testimonials-admin";
import { testimonialToValues } from "@/lib/records/testimonials";
import { NewTestimonialForm } from "./new-testimonial-form";
import { TestimonialEditor } from "./testimonial-editor";
import { TestimonialList } from "./testimonial-list";

export const metadata: Metadata = {
  title: "Testimonials",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The testimonials screen.
 *
 * Built 2026-08-28, to close a gap found while filling the site with content:
 * the table, the public rendering and the case-study dropdown all existed, and
 * there was no way to create a row. The dropdown was always empty and the quote
 * block on a case study could never appear.
 *
 * Two columns rather than the usual three. There is no preview pane because
 * there is no page to preview: a quote is rendered inside the case study it is
 * attached to, so the honest preview is that case study — and the link to it is
 * on this screen only once the quote has been attached to one.
 */
export default async function TestimonialsScreen({ searchParams }: Props) {
  await requireMenu("testimonials");

  const query = await searchParams;
  const requested = typeof query.quote === "string" ? query.quote : null;

  const [quotes, assets, projects] = await Promise.all([
    getAdminTestimonials(),
    getMediaOptions(),
    getProjectOptions(),
  ]);

  const selectedId = quotes.find((quote) => quote.id === requested)?.id ?? quotes[0]?.id ?? null;

  const selected = selectedId ? await getAdminTestimonial(selectedId) : null;

  const waiting = quotes.filter(
    (quote) => quote.status !== "published" && !quote.consent_confirmed,
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">Testimonials</h1>
        <p className="measure mt-2 text-sm leading-relaxed text-text-muted">
          What clients have said about the work, in their own words. A quote is
          shown on the case study it is attached to; it is not published until
          you have confirmed the person said it and agreed to it being used.
        </p>
      </header>

      {waiting > 0 && (
        <p className="mt-6 rounded-xl border border-border bg-surface-2/50 p-4 text-sm leading-relaxed">
          <strong className="font-medium">
            {waiting === 1
              ? "One quote is waiting on consent."
              : `${waiting} quotes are waiting on consent.`}
          </strong>{" "}
          They stay off the site until it is recorded.
        </p>
      )}

      <div className="mt-10 grid gap-8 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <h2 className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
            In the order shown
          </h2>
          <div className="mt-3">
            <TestimonialList
              quotes={quotes.map((quote) => ({
                id: quote.id,
                author_name: quote.author_name,
                company_name: quote.company_name,
                status: quote.status,
                consent_confirmed: quote.consent_confirmed,
              }))}
              selectedId={selectedId}
            />
            <NewTestimonialForm />
          </div>
        </div>

        <div className="min-w-0">
          {selected ? (
            <div className="surface-raised rounded-2xl border border-border p-6">
              {/*
                Keyed on the quote, so selecting another one remounts the form.
                Without it React would reuse the component and keep the first
                quote in state — the editor would show one person's words under
                another person's name, which on this screen of all screens is
                the worst thing it could do.
              */}
              <TestimonialEditor
                key={selected.id}
                id={selected.id}
                values={testimonialToValues(selected)}
                assets={assets}
                projects={projects}
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-surface-2/40 p-8">
              <h2 className="font-display text-lg font-semibold">Nothing recorded yet</h2>
              <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
                Record a quote on the left and it will open here. Quotes start as
                drafts and stay off the site until their consent is recorded, so
                nothing can reach a page by being typed here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
