import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SceneMount } from "@/components/three/scene-mount";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeroContent {
  eyebrow?: string;
  heading: string;
  /** Rendered in the accent colour. Must appear verbatim inside `heading`. */
  highlight?: string;
  subheading: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  /** Short capability words under the fold line. Not statistics — we have none. */
  capabilities?: string[];
}

/**
 * Splits the heading so one phrase can carry the accent colour, without
 * needing HTML in the database. If the phrase is absent the heading renders
 * unchanged, so a content edit can never break the layout.
 */
function splitHeading(heading: string, highlight?: string) {
  if (!highlight) return [heading, null, null] as const;
  const at = heading.indexOf(highlight);
  if (at === -1) return [heading, null, null] as const;
  return [
    heading.slice(0, at),
    highlight,
    heading.slice(at + highlight.length),
  ] as const;
}

export function Hero({ content }: { content: HeroContent }) {
  const [before, accent, after] = splitHeading(content.heading, content.highlight);

  return (
    <section className="relative overflow-hidden">
      {/* Atmospheric wash. Low contrast, positioned behind the type, and
          pointer-events-none so it never interferes. A static gradient rather
          than an animated one: it costs nothing and does not compete with the
          content for attention. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-144 opacity-[0.18] [background:radial-gradient(60%_50%_at_50%_40%,var(--accent),transparent_70%)]"
      />

      {/*
        On wide screens the lattice sits to the right of the copy, clear of it.

        On narrow screens there is no room beside the text, so it moves behind
        — and is masked to fade out before it reaches the headline. Without the
        mask, nodes drift across the type and the whole thing reads as clutter
        rather than atmosphere.

        Decorative, and marked aria-hidden inside SceneMount.
      */}
      <SceneMount
        scene="assemble"
        className={cn(
          "pointer-events-none absolute -z-10",
          "-top-8 right-[-30%] h-96 w-[160%] mask-[radial-gradient(60%_60%_at_60%_35%,#000,transparent_75%)]",
          "lg:-top-12 lg:right-[1%] lg:h-160 lg:w-160 lg:mask-none",
        )}
      />

      <div className="container-page relative pb-20 pt-20 md:pb-28 md:pt-32">
        {content.eyebrow && (
          <Reveal>
            <p className="inline-flex items-center rounded-full border border-border bg-surface-2/60 px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.18em] text-text-muted">
              {content.eyebrow}
            </p>
          </Reveal>
        )}

        <Reveal>
          <h1 className="mt-7 max-w-3xl font-display text-[2.75rem] font-semibold leading-[1.05] sm:text-6xl lg:text-7xl">
            {before}
            {accent && <span className="text-accent">{accent}</span>}
            {after}
          </h1>
        </Reveal>

        <Reveal>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-text-muted md:text-xl">
            {content.subheading}
          </p>
        </Reveal>

        <Reveal>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href={content.ctaPrimary.href} size="lg" className="group">
              {content.ctaPrimary.label}
              <ArrowRight
                className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                aria-hidden
              />
            </ButtonLink>
            {content.ctaSecondary && (
              <ButtonLink
                href={content.ctaSecondary.href}
                size="lg"
                variant="secondary"
              >
                {content.ctaSecondary.label}
              </ButtonLink>
            )}
          </div>
        </Reveal>

        {content.capabilities && content.capabilities.length > 0 && (
          <Reveal>
            <ul className="mt-16 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-8 text-sm text-text-subtle">
              {content.capabilities.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </Reveal>
        )}
      </div>
    </section>
  );
}
