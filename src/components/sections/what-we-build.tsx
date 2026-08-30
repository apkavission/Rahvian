import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import { Icon } from "@/components/ui/icon";

export interface WhatWeBuildContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  items: { title: string; body: string; icon?: string }[];
}

/**
 * Capability cards.
 *
 * Uniform tiles rather than a bento of mixed widths. A bento only reads as
 * deliberate when the content is authored to fit it — and this content is
 * edited from an admin panel, where a longer paragraph or a sixth item would
 * make an asymmetric grid look broken rather than designed.
 *
 * Equal height is enforced two ways, because either alone is not enough:
 *   `auto-rows-fr` makes every grid row the same height as its tallest cell,
 *   and `h-full` plus a column flex makes the card fill that height.
 * The result holds whether a body is one line or five.
 */
export function WhatWeBuild({ content }: { content: WhatWeBuildContent }) {
  return (
    <Section background="muted">
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      <div className="reveal-group mt-14 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {content.items.map((item) => (
          <Reveal key={item.title} className="h-full">
            <article className="surface-raised group flex h-full flex-col rounded-2xl border border-border p-7 transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong">
              <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:scale-105">
                <Icon name={item.icon} className="size-5" />
              </span>

              <h3 className="mt-6 font-display text-xl font-semibold">
                {item.title}
              </h3>
              {/* flex-1 pushes nothing below it, but guarantees the card body
                  absorbs the leftover height so every card ends level. */}
              <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
                {item.body}
              </p>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
