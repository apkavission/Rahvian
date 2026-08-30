import Link from "next/link";
import { ArrowUpRight, Check, KeyRound } from "lucide-react";
import { NaturalImage } from "@/components/media/image";
import { readGallery } from "@/lib/media/gallery";
import { Reveal } from "@/components/motion/reveal";
import { ProjectCard, PROJECT_TYPE_LABEL } from "@/components/portfolio/project-card";
import { Section, SectionHeading } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import type { ProjectCard as ProjectCardData, ProjectImage } from "@/lib/queries/projects";
import type { Technology } from "@/lib/queries/technologies";
import type { Enums } from "@/types/database";

/**
 * One portfolio item, from a project row.
 *
 * Lifted out of the public route so the admin's preview renders the same
 * component rather than a second version of it. A preview that only
 * approximates the page is worse than no preview, because it is trusted — and
 * the two would drift the first time a heading changed on one side only.
 *
 * It takes plain values rather than fetching: the public route reads through
 * the cache anonymously, the preview reads uncached as the signed-in user so it
 * can show a draft, and neither decision belongs in a component that renders.
 *
 * Every block below is conditional on the database holding something for it. A
 * project with a summary and nothing else renders as a short, complete page
 * rather than a skeleton of empty headings — which matters here more than
 * anywhere, because early portfolio entries are always partly documented.
 */
export interface ProjectDetailData {
  slug: string;
  title: string;
  type: Enums<"project_type">;
  category: string | null;
  client_name: string | null;
  summary: string;
  problem: string | null;
  solution: string | null;
  features: unknown;
  capabilities: unknown;
  gallery: unknown;
  variants: unknown;
  demo_credentials: unknown;
  live_url: string | null;
  admin_demo_url: string | null;
  year: number | null;
  thumbnail: ProjectImage | null;
}

export function ProjectDetail({
  project,
  technologies,
  media,
  others,
}: {
  project: ProjectDetailData;
  technologies: Technology[];
  /** Gallery images by media id. A deleted asset simply drops out. */
  media: Map<string, ProjectImage>;
  others: ProjectCardData[];
}) {
  const gallery = readGallery(project.gallery);
  const features = stringList(project.features);
  const capabilities = stringList(project.capabilities);
  const variants = readVariants(project.variants);
  const credentials = readCredentials(project.demo_credentials);
  const typeLabel = PROJECT_TYPE_LABEL[project.type];

  return (
    <>
      <Section className="pt-14 md:pt-20">
        <Reveal className="max-w-3xl">
          <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
            <Link href="/portfolio" className="text-text-subtle transition-colors hover:text-accent">
              Portfolio
            </Link>
            <span className="mx-2 text-text-subtle" aria-hidden>
              /
            </span>
            <span className="text-accent">{typeLabel}</span>
          </nav>

          <h1 className="mt-8 font-display text-3xl font-semibold leading-[1.12] sm:text-4xl lg:text-5xl">
            {project.title}
          </h1>

          {/* Only client work carries a client name, and the check constraint
              on the table is what guarantees that. */}
          {project.client_name && (
            <p className="mt-4 text-lg text-text-muted">for {project.client_name}</p>
          )}

          {project.summary && (
            <p className="mt-6 text-lg leading-relaxed text-text-muted">{project.summary}</p>
          )}

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            <Meta term="Type" value={typeLabel} />
            {project.category && <Meta term="Category" value={project.category} />}
            {project.year && <Meta term="Year" value={String(project.year)} />}
          </dl>

          {(project.live_url || project.admin_demo_url) && (
            <div className="mt-9 flex flex-wrap gap-3">
              {project.live_url && (
                <ButtonLink href={project.live_url} size="lg" target="_blank" rel="noopener noreferrer">
                  Open the live site
                  <ArrowUpRight className="size-4" aria-hidden />
                </ButtonLink>
              )}
              {project.admin_demo_url && (
                <ButtonLink
                  href={project.admin_demo_url}
                  size="lg"
                  variant="secondary"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open the admin demo
                  <ArrowUpRight className="size-4" aria-hidden />
                </ButtonLink>
              )}
            </div>
          )}
        </Reveal>

        {project.thumbnail && (
          <Reveal className="mt-14">
            <NaturalImage
              image={project.thumbnail}
              eager
              className="rounded-2xl border border-border"
            />
          </Reveal>
        )}
      </Section>

      {credentials && (
        <Section background="muted" className="py-14 md:py-16">
          <Reveal>
            <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
                <div>
                  <h2 className="font-display text-base font-semibold">Demo sign-in</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    A read-only account, so you can look around without breaking anything.
                  </p>
                </div>
              </div>
              <dl className="grid gap-2 font-mono text-sm sm:text-right">
                <div className="flex gap-3 sm:justify-end">
                  <dt className="text-text-subtle">Email</dt>
                  <dd>{credentials.email}</dd>
                </div>
                <div className="flex gap-3 sm:justify-end">
                  <dt className="text-text-subtle">Password</dt>
                  <dd>{credentials.password}</dd>
                </div>
              </dl>
            </div>
          </Reveal>
        </Section>
      )}

      {(project.problem || project.solution) && (
        <Section>
          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">
            {project.problem && (
              <div>
                <SectionHeading eyebrow="The problem" title="What needed solving" className="max-w-none" />
                <p className="measure mt-6 leading-relaxed text-text-muted">{project.problem}</p>
              </div>
            )}
            {project.solution && (
              <div>
                <SectionHeading eyebrow="The build" title="What we did" className="max-w-none" />
                <p className="measure mt-6 leading-relaxed text-text-muted">{project.solution}</p>
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

      {capabilities.length > 0 && (
        <Section>
          <SectionHeading eyebrow="Underneath" title="What it can handle" />
          <ul className="mt-10 space-y-4">
            {capabilities.map((capability) => (
              <li key={capability} className="flex gap-3 text-sm leading-relaxed text-text-muted">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                <span>{capability}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {gallery.length > 0 && media.size > 0 && (
        <Section background="muted">
          <SectionHeading eyebrow="Screens" title="A look inside" />
          <ul className="reveal-group mt-12 grid gap-6 sm:grid-cols-2">
            {gallery.map((item) => {
              const image = media.get(item.media_id);
              // A deleted asset drops out of the gallery rather than leaving a
              // broken image behind.
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

      {technologies.length > 0 && (
        <Section>
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

      {variants.length > 0 && (
        <Section background="muted">
          <SectionHeading
            eyebrow="Same system, other industries"
            title="Live variants"
            description="One codebase, configured per industry. Each of these is a running site, not a mockup."
          />
          <ul className="reveal-group mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {variants.map((variant) => (
              <Reveal key={variant.slug} as="li" className="h-full">
                <a
                  href={variant.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="surface-raised flex h-full items-center justify-between gap-4 rounded-2xl border border-border p-6 transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
                >
                  <span className="font-display text-base font-semibold">{variant.label}</span>
                  <ArrowUpRight className="size-4 shrink-0 text-accent" aria-hidden />
                </a>
              </Reveal>
            ))}
          </ul>
        </Section>
      )}

      {others.length > 0 && (
        <Section>
          <SectionHeading eyebrow="More work" title="Other things we have built" />
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((other) => (
              <ProjectCard key={other.id} project={other} />
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

function readVariants(value: unknown): { label: string; slug: string; url: string }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.url !== "string") return [];
    return [
      {
        label: row.label,
        slug: typeof row.slug === "string" ? row.slug : row.label,
        url: row.url,
      },
    ];
  });
}

/**
 * Demo credentials, shown only when both halves are present.
 *
 * The table already restricts this column to demo rows, so there is no risk of
 * printing a real account here. Half a credential pair is unusable, so it is
 * treated as absent rather than rendered with a blank.
 */
function readCredentials(value: unknown): { email: string; password: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.email !== "string" || typeof row.password !== "string") return null;
  if (!row.email.trim() || !row.password.trim()) return null;
  return { email: row.email, password: row.password };
}
