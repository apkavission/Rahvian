import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ProjectCard } from "@/components/portfolio/project-card";
import { Section, SectionHeading } from "@/components/sections/section";
import type { BackgroundVariant } from "@/components/sections/section";
import { ButtonLink } from "@/components/ui/button";
import { getProjects } from "@/lib/queries/projects";
import type { Enums } from "@/types/database";

type ProjectType = Enums<"project_type">;

export interface PortfolioGridContent {
  eyebrow?: string;
  heading: string;
  description?: string;
  /** Restrict to these project types. Omitted means all of them. */
  types?: ProjectType[];
  /** Cap the number shown, for a "selected work" block on another page. */
  limit?: number;
  /** Shown in place of the grid when nothing matches. */
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
 * A grid of published work.
 *
 * The empty state is content, not a placeholder. A portfolio with nothing in
 * it yet is the honest position for a new company, and saying so plainly —
 * with a route to the thing a visitor actually wants — reads better than an
 * invented case study. It disappears on its own the moment a project is
 * published.
 */
export async function PortfolioGrid({ content }: { content: PortfolioGridContent }) {
  const all = await getProjects();

  const types = content.types;
  const filtered = types?.length ? all.filter((project) => types.includes(project.type)) : all;
  const projects = content.limit ? filtered.slice(0, content.limit) : filtered;

  return (
    <Section background={content.background ?? "default"}>
      <SectionHeading
        eyebrow={content.eyebrow}
        title={content.heading}
        description={content.description}
      />

      {projects.length > 0 ? (
        <>
          <ul className="reveal-group mt-12 grid auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
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
