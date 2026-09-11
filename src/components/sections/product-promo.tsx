import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";

export interface ProductPromoContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  productName: string;
  productTagline: string;
  features: { title: string; body: string }[];
  href: string;
  linkLabel: string;
}

/**
 * Our own product.
 *
 * Labelled unambiguously as ours throughout — the brief is explicit that
 * A product of our own must never read as client work. It earns its place on a services
 * homepage for a specific reason: a company that ships and maintains its own
 * production software is a different proposition from one that only bills
 * hours, and this is the section that makes that argument.
 */
export function ProductPromo({ content }: { content: ProductPromoContent }) {
  return (
    <Section background="muted">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <Reveal>
        <div className="surface-raised mt-14 overflow-hidden rounded-3xl border border-border">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="p-8 md:p-12">
              <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 font-mono text-xs uppercase tracking-[0.16em] text-accent">
                Our Product
              </span>

              <h3 className="mt-6 font-display text-3xl font-semibold">
                {content.productName}
              </h3>
              <p className="measure mt-3 text-lg leading-relaxed text-text-muted">
                {content.productTagline}
              </p>

              <Link
                href={content.href}
                className="group mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-accent"
              >
                {content.linkLabel}
                <ArrowUpRight
                  className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </div>

            <ul className="grid gap-px border-t border-border bg-border lg:border-l lg:border-t-0">
              {content.features.map((feature) => (
                <li key={feature.title} className="bg-surface p-7">
                  <div className="flex gap-3">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                    <div>
                      <h4 className="font-medium">{feature.title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
