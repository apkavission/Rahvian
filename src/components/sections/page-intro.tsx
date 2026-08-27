import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PageIntroContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Short, factual phrases under the copy. Not statistics — we have none. */
  points?: string[];
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
}

/**
 * The opening block of an interior page.
 *
 * Deliberately not `hero`: the hero carries a WebGL scene and a full viewport
 * of vertical space, which is right once per visit and wrong on every page
 * after it. This is the quieter opening — and it is the section that renders
 * the `<h1>`, so an interior page assembled entirely from `page_sections`
 * still has exactly one.
 */
export function PageIntro({ content }: { content: PageIntroContent }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Same low-contrast wash as the hero, at a fraction of the height, so
          interior pages read as the same site without repeating its opening. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-96 opacity-[0.18] [background:radial-gradient(45%_50%_at_50%_50%,var(--accent),transparent_70%)]"
      />

      <div className="container-page relative pb-16 pt-14 md:pb-20 md:pt-20">
        <Reveal className="max-w-3xl">
          {content.eyebrow && (
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              {content.eyebrow}
            </p>
          )}

          <h1
            className={cn(
              "font-display text-3xl font-semibold leading-[1.12] sm:text-4xl lg:text-5xl",
              content.eyebrow && "mt-5",
            )}
          >
            {content.heading}
          </h1>

          {content.description && (
            <p className="mt-6 text-lg leading-relaxed text-text-muted">
              {content.description}
            </p>
          )}

          {content.points && content.points.length > 0 && (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {content.points.map((point) => (
                <li
                  key={point}
                  className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-text-subtle"
                >
                  <span className="size-1.5 rounded-full bg-accent" aria-hidden />
                  {point}
                </li>
              ))}
            </ul>
          )}

          {(content.ctaPrimary || content.ctaSecondary) && (
            <div className="mt-9 flex flex-wrap gap-3">
              {content.ctaPrimary && (
                <ButtonLink href={content.ctaPrimary.href} size="lg" className="group">
                  {content.ctaPrimary.label}
                  <ArrowRight
                    className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </ButtonLink>
              )}
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
          )}
        </Reveal>
      </div>
    </section>
  );
}
