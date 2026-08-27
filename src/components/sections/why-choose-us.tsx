import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";

export interface WhyChooseUsContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  points: { title: string; body: string }[];
}

/**
 * Reasons to choose us.
 *
 * Every point here has to be something we can defend in a meeting. There are
 * no numbers in this section by design — a new company quoting statistics is
 * either inflating them or counting something meaningless.
 */
export function WhyChooseUs({ content }: { content: WhyChooseUsContent }) {
  return (
    <Section>
      <div className="grid gap-14 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-20">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.heading}
          description={content.description}
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <ol className="reveal-group space-y-px">
          {content.points.map((point, index) => (
            <Reveal key={point.title} as="li">
              <div className="group grid gap-4 border-t border-border py-8 sm:grid-cols-[3rem_1fr] sm:gap-6">
                <span className="font-mono text-sm text-text-subtle transition-colors duration-[--duration-base] group-hover:text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold">
                    {point.title}
                  </h3>
                  <p className="measure mt-2.5 leading-relaxed text-text-muted">
                    {point.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </Section>
  );
}
