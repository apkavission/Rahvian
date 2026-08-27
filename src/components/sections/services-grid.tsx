import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import { getServices } from "@/lib/queries/services";

export interface ServicesGridContent {
  eyebrow?: string;
  heading: string;
  description?: string;
}

function priceLabel(service: {
  is_custom_quote: boolean;
  price_from: number | null;
}) {
  if (service.is_custom_quote) return "Custom quote";
  if (service.price_from === null) return null;
  return `From ₹${Number(service.price_from).toLocaleString("en-IN")}`;
}

/**
 * The service list, read live from the database.
 *
 * The section stores only its heading; the cards themselves come from
 * `company.services`. Adding an eighth service is a database row, not a code
 * change, and it appears here and in the navigation at the same moment.
 */
export async function ServicesGrid({ content }: { content: ServicesGridContent }) {
  const services = await getServices();
  if (services.length === 0) return null;

  return (
    <Section>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      {/* auto-rows-fr keeps every card in a row the same height however long
          the admin makes a summary. Without it the grid tracks content and the
          row looks ragged the moment one description runs longer. */}
      <div className="reveal-group mt-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service, index) => {
          const price = priceLabel(service);

          return (
            <Reveal key={service.id} className="h-full">
              <Link
                href={`/services/${service.slug}`}
                className="surface-raised group flex h-full flex-col rounded-2xl border border-border p-7 transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-display text-lg font-semibold leading-snug">
                    {service.name}
                  </h3>
                  <ArrowUpRight
                    className="mt-0.5 size-4 shrink-0 text-text-subtle transition-[transform,color] duration-[--duration-base] ease-[--ease-out] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent"
                    aria-hidden
                  />
                </div>

                <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
                  {service.summary}
                </p>

                {price && (
                  <p className="mt-6 font-mono text-xs uppercase tracking-[0.12em] text-text-subtle">
                    {price}
                  </p>
                )}
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
