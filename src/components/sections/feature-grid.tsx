import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export interface FeatureGridContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Icon name from the curated map, plus the claim and one sentence under it. */
  features: { icon?: string; title: string; body: string }[];
  /**
   * Widest column count. Narrower screens always step down.
   *
   * Accepts a string as well as a number: a `<select>` in the admin submits
   * "3", and coercing here is cheaper than a field kind that exists to hold
   * three integers.
   */
  columns?: 2 | 3 | 4 | "2" | "3" | "4";
  background?: BackgroundVariant;
}

const COLUMNS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

/**
 * A grid of capabilities.
 *
 * The generic feature block the product page needs and the service pages will
 * reuse. It is deliberately not `why_choose_us`: that section argues for the
 * company and is numbered prose; this one describes what a thing does, and a
 * reader scans it rather than reading it.
 *
 * Icons are named from the database against a curated map, so an unknown name
 * degrades to a neutral glyph rather than breaking the page.
 */
export function FeatureGrid({ content }: { content: FeatureGridContent }) {
  const features = content.features ?? [];
  if (features.length === 0) return null;

  const parsed = Number(content.columns);
  const columns: 2 | 3 | 4 = parsed === 2 || parsed === 4 ? parsed : 3;

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <ul
        className={cn(
          "reveal-group mt-14 grid auto-rows-fr gap-4",
          COLUMNS[columns],
        )}
      >
        {features.map((feature) => (
          <Reveal key={feature.title} as="li" className="h-full">
            <div className="surface-raised flex h-full flex-col rounded-2xl border border-border p-7">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon name={feature.icon} className="size-5" />
              </span>

              <h3 className="mt-6 font-display text-lg font-semibold leading-snug">
                {feature.title}
              </h3>

              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
                {feature.body}
              </p>
            </div>
          </Reveal>
        ))}
      </ul>
    </Section>
  );
}
