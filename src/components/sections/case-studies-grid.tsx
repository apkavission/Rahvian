import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FramedImage } from "@/components/media/image";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import { getCaseStudies } from "@/lib/queries/case-studies";
import type { CaseStudyCard } from "@/lib/queries/case-studies";

export interface CaseStudiesGridContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Cap the number shown, for a block on another page. */
  limit?: number;
  /** Shown in place of the grid when nothing is published. */
  empty?: {
    heading: string;
    body: string;
    cta?: { label: string; href: string };
  };
  more?: { label: string; href: string };
  background?: BackgroundVariant;
}

/**
 * Published case studies.
 *
 * A case study is the longest-form claim this site makes, so the empty state
 * matters more here than anywhere: we write one after a project is live and
 * the client has agreed to be named, and until then the page says exactly
 * that rather than presenting a demo as an engagement.
 */
export async function CaseStudiesGrid({ content }: { content: CaseStudiesGridContent }) {
  const all = await getCaseStudies();
  const studies = content.limit ? all.slice(0, content.limit) : all;

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      {studies.length > 0 ? (
        <>
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => (
              <StudyCard key={study.id} study={study} />
            ))}
          </ul>

          {content.more && (
            <Reveal>
              <div className="mt-10">
                <ButtonLink href={content.more.href} variant="secondary" className="group">
                  {content.more.label}
                  <ArrowRight
                    className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </ButtonLink>
              </div>
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

function StudyCard({ study }: { study: CaseStudyCard }) {
  const meta = [study.industry, study.duration].filter(Boolean);

  return (
    <Reveal as="li" className="h-full">
      <Link
        href={`/case-studies/${study.slug}`}
        className="surface-raised group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
      >
        {study.image ? (
          <FramedImage
            image={study.image}
            className="aspect-[16/10] border-b border-border"
          />
        ) : (
          <div
            aria-hidden
            className="aspect-[16/10] border-b border-border bg-surface-2 opacity-40 [background:repeating-linear-gradient(135deg,var(--border)_0_1px,transparent_1px_10px)]"
          />
        )}

        <div className="flex flex-1 flex-col p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
            Case study
          </p>

          <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
            {study.title}
          </h3>

          {study.client_name && (
            <p className="mt-1 text-sm text-text-muted">for {study.client_name}</p>
          )}

          {study.problem && (
            <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
              {study.problem}
            </p>
          )}

          {meta.length > 0 && (
            <p className="mt-5 border-t border-border pt-4 font-mono text-xs text-text-subtle">
              {meta.join(" · ")}
            </p>
          )}
        </div>
      </Link>
    </Reveal>
  );
}
