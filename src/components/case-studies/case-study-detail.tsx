import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { NaturalImage } from "@/components/media/image";
import { readGallery } from "@/lib/media/gallery";
import { Reveal } from "@/components/motion/reveal";
import { Section, SectionHeading } from "@/components/sections/section";
import type { CaseStudyCard, CaseStudyImage } from "@/lib/queries/case-studies";
import type { ProjectImage } from "@/lib/queries/projects";
import type { Technology } from "@/lib/queries/technologies";
import { formatDate } from "@/lib/utils";

/**
 * One case study, from a row.
 *
 * Lifted out of the public route so the admin's preview renders the same
 * component rather than a second version of it. A preview that only
 * approximates the page is worse than no preview, because it is trusted.
 *
 * Every block is conditional on the row holding something for it, and the
 * results block most of all: `results` is nullable by design, because a study
 * with no measured outcome is still worth publishing and inventing a figure to
 * fill the space is the one thing this page must never do.
 */
export interface CaseStudyDetailData {
  slug: string;
  title: string;
  client_name: string | null;
  industry: string | null;
  duration: string | null;
  problem: string | null;
  solution: string | null;
  features: unknown;
  results: unknown;
  screenshots: unknown;
  published_at: string | null;
  image: CaseStudyImage | null;
  testimonial: {
    quote: string;
    author_name: string;
    author_role: string | null;
    company_name: string | null;
  } | null;
  project: { slug: string; title: string } | null;
}

export function CaseStudyDetail({
  study,
  technologies,
  media,
  others,
}: {
  study: CaseStudyDetailData;
  technologies: Technology[];
  /** Screenshot images by media id. A deleted asset simply drops out. */
  media: Map<string, ProjectImage>;
  others: CaseStudyCard[];
}) {
  const screenshots = readGallery(study.screenshots);
  const features = stringList(study.features);
  const results = readResults(study.results);
  const published = formatDate(study.published_at);

  return (
    <>
      <Section className="pt-14 md:pt-20">
        <Reveal className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
            <Link
              href="/case-studies"
              className="text-text-subtle transition-colors hover:text-accent"
            >
              Case studies
            </Link>
            {study.industry && (
              <>
                <span className="mx-2 text-text-subtle" aria-hidden>
                  /
                </span>
                <span className="text-accent">{study.industry}</span>
              </>
            )}
          </nav>

          <h1 className="mt-8 font-display text-3xl font-semibold leading-[1.12] sm:text-4xl lg:text-5xl">
            {study.title}
          </h1>

          {study.client_name && (
            <p className="mt-4 text-lg text-text-muted">for {study.client_name}</p>
          )}

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {study.industry && <Meta term="Industry" value={study.industry} />}
            {study.duration && <Meta term="Duration" value={study.duration} />}
            {published && <Meta term="Published" value={published} />}
          </dl>

          {study.project && (
            <p className="mt-8">
              <Link
                href={`/portfolio/${study.project.slug}`}
                className="group inline-flex items-center gap-1.5 text-sm font-medium text-accent"
              >
                See {study.project.title} in the portfolio
                <ArrowUpRight
                  className="size-4 transition-transform duration-[--duration-base] ease-[--ease-out] group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </p>
          )}
        </Reveal>

        {study.image && (
          <Reveal className="mt-14">
            <NaturalImage
              image={study.image}
              eager
              className="rounded-2xl border border-border"
            />
          </Reveal>
        )}
      </Section>

      {(study.problem || study.solution) && (
        <Section>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            {study.problem && (
              <div>
                <SectionHeading
                  eyebrow="The problem"
                  title="What needed solving"
                  className="max-w-none"
                />
                <p className="measure mt-6 leading-relaxed text-text-muted">{study.problem}</p>
              </div>
            )}
            {study.solution && (
              <div>
                <SectionHeading eyebrow="The build" title="What we did" className="max-w-none" />
                <p className="measure mt-6 leading-relaxed text-text-muted">{study.solution}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {features.length > 0 && (
        <Section background="muted">
          <SectionHeading eyebrow="What it does" title="Built into it" />
          <ul className="reveal-group mt-12 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {features.map((feature) => (
              <Reveal
                key={feature}
                as="li"
                className="flex gap-3 border-b border-border pb-4 text-sm leading-relaxed"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
                <span>{feature}</span>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {/* Only rendered when the row actually carries measured outcomes. */}
      {results.length > 0 && (
        <Section>
          <SectionHeading
            eyebrow="Outcome"
            title="What changed"
            description="Measured after launch. Where a number is not one we can stand behind, it is not here."
          />
          <dl className="reveal-group mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((result) => (
              <Reveal key={result.label}>
                <div className="surface-raised h-full rounded-2xl border border-border p-7">
                  <dt className="font-mono text-xs uppercase tracking-[0.16em] text-text-subtle">
                    {result.label}
                  </dt>
                  <dd className="mt-4 font-display text-3xl font-semibold">{result.value}</dd>
                  {result.note && (
                    <p className="mt-3 text-sm leading-relaxed text-text-muted">{result.note}</p>
                  )}
                </div>
              </Reveal>
            ))}
          </dl>
        </Section>
      )}

      {screenshots.length > 0 && media.size > 0 && (
        <Section background="muted">
          <SectionHeading eyebrow="Screens" title="A look inside" />
          <ul className="reveal-group mt-12 grid gap-6 sm:grid-cols-2">
            {screenshots.map((item) => {
              const image = media.get(item.media_id);
              // A deleted asset drops out rather than leaving a broken image.
              if (!image) return null;

              return (
                <Reveal key={item.media_id} as="li">
                  <figure>
                    <NaturalImage
                      image={image}
                      className="rounded-xl border border-border"
                    />
                    {item.caption && (
                      <figcaption className="mt-3 text-sm text-text-subtle">
                        {item.caption}
                      </figcaption>
                    )}
                  </figure>
                </Reveal>
              );
            })}
          </ul>
        </Section>
      )}

      {/* The table refuses to publish a quote without recorded consent, so
          anything reaching here has been agreed to. */}
      {study.testimonial && (
        <Section>
          <Reveal>
            <figure className="measure">
              <blockquote className="border-l-2 border-accent pl-6 font-display text-xl leading-relaxed sm:text-2xl">
                {study.testimonial.quote}
              </blockquote>
              <figcaption className="mt-6 pl-6 text-sm text-text-muted">
                {study.testimonial.author_name}
                {[study.testimonial.author_role, study.testimonial.company_name]
                  .filter(Boolean)
                  .map((part) => `, ${part}`)
                  .join("")}
              </figcaption>
            </figure>
          </Reveal>
        </Section>
      )}

      {technologies.length > 0 && (
        <Section background="muted">
          <SectionHeading eyebrow="Built with" title="The stack behind it" />
          <ul className="mt-10 flex flex-wrap gap-2">
            {technologies.map((tech) => (
              <li
                key={tech.id}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted"
              >
                {tech.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {others.length > 0 && (
        <Section>
          <SectionHeading eyebrow="More reading" title="Other case studies" />
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <Reveal key={other.id} as="li" className="h-full">
                <Link
                  href={`/case-studies/${other.slug}`}
                  className="surface-raised group flex h-full flex-col rounded-2xl border border-border p-6 transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
                >
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
                    Case study
                  </p>
                  <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
                    {other.title}
                  </h3>
                  {other.problem && (
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
                      {other.problem}
                    </p>
                  )}
                </Link>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------

function Meta({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-xs uppercase tracking-[0.16em] text-text-subtle">{term}</dt>
      <dd className="mt-1.5 text-sm">{value}</dd>
    </div>
  );
}

/**
 * JSONB columns are `Json`, which is legitimately anything. Everything read
 * out of one is filtered to the shape this page renders; anything else is
 * dropped rather than displayed, so a malformed edit costs a block instead of
 * the whole page.
 */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

/**
 * Measured outcomes: `[{ "label": "...", "value": "...", "note": "..." }]`.
 *
 * `value` is a string rather than a number on purpose — an outcome is as often
 * "two weeks" or "from 4 staff to 1" as it is a percentage, and forcing it
 * into a number is how a qualitative result becomes an invented statistic.
 */
function readResults(value: unknown): { label: string; value: string; note: string | null }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.value !== "string") return [];
    if (!row.label.trim() || !row.value.trim()) return [];

    return [
      {
        label: row.label,
        value: row.value,
        note: typeof row.note === "string" && row.note.trim() ? row.note : null,
      },
    ];
  });
}
