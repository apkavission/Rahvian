import type { Metadata } from "next";
import { requireMenu } from "@/lib/auth/session";
import { TestimonialCard } from "@/components/testimonials/testimonial-card";
import { getAdminTestimonialCards } from "@/lib/queries/testimonials-admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Testimonials preview",
  robots: { index: false, follow: false, nocache: true },
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * The quotes as they will look, including the ones not published yet.
 *
 * ---------------------------------------------------------------------------
 * **Why this screen had no preview, and why that mattered more here than
 * elsewhere.**
 *
 * Nine admin screens have one and this did not, because until 2026-08-31 there
 * was nothing to preview: the quotes were collected and consented to, and no
 * section type could put them on a page. The `testimonials` section fixed
 * that, and this is the other half of it.
 *
 * A quote is the one piece of content on this site written by somebody else.
 * Seeing it as the visitor will — the length of it against the card, whether
 * the attribution reads as a real person, whether five stars over two words
 * looks like flattery — is a judgement that cannot be made from a row in a
 * list.
 *
 * The whole grid rather than one card, because these are read against each
 * other: three quotes of one line each look thin in a way no single one does.
 *
 * The same `TestimonialCard` the site renders, over rows read uncached as the
 * signed-in user, which is what makes a draft visible at all. It sits outside
 * the `(dashboard)` group so the admin chrome does not wrap it.
 */
export default async function TestimonialsPreview({ searchParams }: Props) {
  await requireMenu("testimonials");

  const query = await searchParams;
  const selectedId = typeof query.testimonial === "string" ? query.testimonial : null;

  const quotes = await getAdminTestimonialCards();
  const live = quotes.filter((quote) => quote.status === "published").length;

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {quotes.length} {quotes.length === 1 ? "quote" : "quotes"} · {live} on the
          site
        </p>
      </div>

      {quotes.length > 0 ? (
        <div className="px-4 py-10 sm:px-6 lg:px-8">
          <ul
            className={cn(
              "mx-auto grid max-w-4xl auto-rows-fr gap-4",
              quotes.length > 1 && "sm:grid-cols-2",
            )}
          >
            {quotes.map((quote) => {
              const unpublished = quote.status !== "published";

              return (
                <li
                  key={quote.id}
                  className={cn(
                    "relative h-full rounded-2xl",
                    quote.id === selectedId && "ring-2 ring-accent ring-offset-2 ring-offset-bg",
                    unpublished && "opacity-60",
                  )}
                >
                  {unpublished && (
                    <span className="absolute -top-2.5 right-4 z-10 inline-flex items-center rounded-full border border-border-strong bg-surface px-2.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-text-subtle">
                      {quote.status} · not on the site
                    </span>
                  )}
                  <TestimonialCard testimonial={quote} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="px-6 py-16">
          <p className="mx-auto max-w-md text-center text-sm leading-relaxed text-text-muted">
            No quotes yet. A page with a testimonials section leaves it out
            entirely rather than showing an empty grid, so there is nothing to
            preview.
          </p>
        </div>
      )}
    </div>
  );
}
