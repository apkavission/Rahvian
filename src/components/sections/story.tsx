import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";

export interface StoryContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Prose, one entry per paragraph. An optional heading turns it into a beat. */
  blocks: { heading?: string; body: string }[];
  /** Pulled out beside the prose. Facts we can defend, never a statistic. */
  aside?: { heading: string; items: string[] };
  background?: BackgroundVariant;
}

/**
 * Narrative prose with an optional factual aside.
 *
 * Paragraphs are separate rows rather than one blob of text, because the admin
 * edits them one at a time and because a paragraph with a heading becomes a
 * beat in the story without needing HTML in the database. Nothing here accepts
 * markup: the escaping stays in code, so a paste can never break the page.
 */
export function Story({ content }: { content: StoryContent }) {
  const blocks = content.blocks ?? [];

  return (
    <Section background={content.background ?? "default"}>
      <div className="grid gap-14 lg:grid-cols-[minmax(0,24rem)_1fr] lg:gap-20">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={content.heading}
          description={content.description}
          className="lg:sticky lg:top-28 lg:self-start"
        />

        <div className="reveal-group">
          {blocks.map((block, index) => (
            <Reveal key={`${block.heading ?? "p"}-${index}`}>
              <div className="border-t border-border py-8 first:border-t-0 first:pt-0">
                {block.heading && (
                  <h3 className="font-display text-xl font-semibold">{block.heading}</h3>
                )}
                <p className={block.heading ? "measure mt-2.5 leading-relaxed text-text-muted" : "measure leading-relaxed text-text-muted"}>
                  {block.body}
                </p>
              </div>
            </Reveal>
          ))}

          {content.aside && content.aside.items.length > 0 && (
            <Reveal>
              <div className="mt-4 rounded-2xl border border-border bg-surface-2/50 p-7">
                <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  {content.aside.heading}
                </h3>
                <ul className="mt-5 space-y-3">
                  {content.aside.items.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed text-text-muted">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </Section>
  );
}
