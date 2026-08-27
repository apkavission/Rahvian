import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { PlanCard } from "@/components/pricing/plan-card";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import { getPricingPlans } from "@/lib/queries/pricing";

export interface PricingTableContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Sits under the cards. Where the tax and exclusions line belongs. */
  note?: string;
  /** Shown in place of the cards when no plan is published. */
  empty?: {
    heading: string;
    body: string;
    cta?: { label: string; href: string };
  };
  background?: BackgroundVariant;
}

/**
 * The pricing cards, read live from `pricing_plans`.
 *
 * A price is the single most volatile piece of content on a services site, so
 * none of it is in this file — the section stores its heading and the note
 * beneath the cards, and everything else is a row the owner edits at
 * `/admin/pricing`.
 *
 * The database already refuses to publish a plan that neither names a starting
 * price nor declares itself a custom quote, so the card always has something
 * honest to print and no card can go out with an empty price line.
 *
 * The card itself lives in `components/pricing/plan-card` because the admin
 * preview renders the same one over draft rows.
 */
export async function PricingTable({ content }: { content: PricingTableContent }) {
  const plans = await getPricingPlans();

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      {plans.length > 0 ? (
        <>
          <ul className="reveal-group mt-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Reveal key={plan.id} as="li" className="h-full">
                <PlanCard plan={plan} />
              </Reveal>
            ))}
          </ul>

          {content.note && (
            <Reveal>
              <p className="measure mt-10 text-sm leading-relaxed text-text-subtle">
                {content.note}
              </p>
            </Reveal>
          )}
        </>
      ) : content.empty ? (
        <Reveal>
          <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface-2/40 p-8 md:p-12">
            <h3 className="font-display text-xl font-semibold">{content.empty.heading}</h3>
            <p className="measure mt-3 leading-relaxed text-text-muted">{content.empty.body}</p>
            {content.empty.cta && (
              <div className="mt-7">
                <ButtonLink href={content.empty.cta.href} className="group">
                  {content.empty.cta.label}
                  <ArrowRight
                    className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </ButtonLink>
              </div>
            )}
          </div>
        </Reveal>
      ) : null}
    </Section>
  );
}
