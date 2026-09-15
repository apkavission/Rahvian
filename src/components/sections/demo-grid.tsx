import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import { getPublicDemoApps } from "@/lib/queries/demos";

export interface DemoGridContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Cap the number of demos shown, for a block on another page. */
  limit?: number;
  /** Shown in place of the grid when no demo is open to anybody. */
  empty?: {
    heading: string;
    body: string;
    cta?: { label: string; href: string };
  };
  /** Link under the grid, e.g. to the full portfolio. */
  more?: { label: string; href: string };
  background?: BackgroundVariant;
}

/**
 * The demos, live, with a way in.
 *
 * ---------------------------------------------------------------------------
 * **This is the one block on the site that can be clicked into a finished
 * product.** A portfolio card shows a picture of work; this opens the work —
 * a whole website, with its own prices, people and booking form, running on its
 * own address. The owner's reason for asking is exactly that: *"ye project ko
 * apne service wale me show karna tabhi to client dekh sakta h"*.
 *
 * ---------------------------------------------------------------------------
 * **Nothing here is typed into the CMS.** The names, the industries and the
 * count of businesses inside each demo are read from the estate at request
 * time, so renaming a clinic in its own panel renames it here. What the CMS
 * owns is the heading above the grid and the sentence under it, which is
 * copy — and the empty state, which is what this renders on the day nothing has
 * been opened to the public yet.
 *
 * ---------------------------------------------------------------------------
 * **A card per demo, listing the businesses inside it.** That is the argument
 * these demos exist to make: one codebase becomes three clinics, three
 * restaurants, three schools, each with its own name, palette and prices. A
 * grid of nineteen businesses would say the opposite — that we built nineteen
 * sites — and would take three screens to scroll.
 *
 * **They open in a new tab**, because a demo is a thing you look at and come
 * back from. Losing the company's own site behind a demo is how a visitor who
 * was reading about us ends up reading about an invented dentist instead.
 */
export async function DemoGrid({ content }: { content: DemoGridContent }) {
  const all = await getPublicDemoApps();
  const demos = content.limit ? all.slice(0, content.limit) : all;

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      {demos.length > 0 ? (
        <>
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((demo) => {
              const first = demo.businesses[0];

              return (
                <li key={demo.key} className="reveal">
                  <a
                    href={first.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-6 transition-colors duration-[--duration-base] hover:border-accent/40 hover:bg-surface-2"
                  >
                    <p className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-text-subtle">
                      {first.industryLabel}
                    </p>

                    <h3 className="font-display mt-3 text-xl font-semibold">
                      {demo.name}
                    </h3>

                    {first.tagline && (
                      <p className="mt-2 text-sm leading-relaxed text-text-muted">
                        {first.tagline}
                      </p>
                    )}

                    {/*
                      The businesses inside it, named.

                      "Three businesses" is a claim; "Smile Care Dental Studio ·
                      HeartLine Cardiac Centre · ClearView Eye Hospital" is the
                      evidence, and it is what makes a visitor press the switcher
                      once they are inside.
                    */}
                    <p className="mt-5 flex-1 text-sm text-text-subtle">
                      {demo.businesses.map((business) => business.businessName).join(" · ")}
                    </p>

                    <span className="mt-6 inline-flex items-center gap-1.5 border-t border-border pt-4 text-sm font-semibold text-accent">
                      Open the demo
                      <ArrowUpRight
                        className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                      <span className="sr-only">(opens in a new tab)</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>

          {content.more && (
            <Reveal>
              <div className="mt-10">
                <ButtonLink href={content.more.href} variant="secondary">
                  {content.more.label}
                </ButtonLink>
              </div>
            </Reveal>
          )}
        </>
      ) : (
        content.empty && (
          <Reveal>
            <div className="mt-12 rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="font-display text-lg font-semibold">{content.empty.heading}</p>
              <p className="measure mx-auto mt-2 text-sm leading-relaxed text-text-muted">
                {content.empty.body}
              </p>

              {content.empty.cta && (
                <div className="mt-6">
                  <ButtonLink href={content.empty.cta.href}>{content.empty.cta.label}</ButtonLink>
                </div>
              )}
            </div>
          </Reveal>
        )
      )}
    </Section>
  );
}
