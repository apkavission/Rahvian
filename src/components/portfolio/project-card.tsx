import Link from "next/link";
import { FramedImage } from "@/components/media/image";
import { Reveal } from "@/components/motion/reveal";
import type { ProjectCard as ProjectCardData } from "@/lib/queries/projects";
import type { Enums } from "@/types/database";

type ProjectType = Enums<"project_type">;

/**
 * What each kind of work is called in public.
 *
 * Every card carries its label. The database already refuses to let a demo
 * name a client, and this is the other half of the same rule: a visitor can
 * always tell in one glance whether they are looking at real client work, a
 * concept we built ourselves, our own product, or work that predates the
 * company. Nothing on this site is left to be assumed.
 */
export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  client: "Client project",
  demo: "Self-built demo",
  inhouse: "Our own product",
  previous: "Earlier work",
};

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const meta = [project.category, project.year ? String(project.year) : null].filter(Boolean);

  return (
    <Reveal as="li" className="h-full">
      <Link
        href={`/portfolio/${project.slug}`}
        className="surface-raised group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-[transform,border-color] duration-[--duration-base] ease-[--ease-out] hover:-translate-y-1 hover:border-border-strong"
      >
        {/*
          The card image.

          `FramedImage` keeps the box's shape and never enlarges the file past
          its own size — the two rules that stop a card looking either cut or
          blurry. See components/media/image.tsx and docs/image-rules.md.
        */}
        {project.thumbnail ? (
          <FramedImage
            image={project.thumbnail}
            className="aspect-[16/10] border-b border-border"
          />
        ) : (
          /* No screenshot yet. A patterned panel is a deliberate blank, not a
             broken image, and keeps the grid's rows even. */
          <div
            aria-hidden
            className="aspect-[16/10] border-b border-border bg-surface-2 opacity-40 [background:repeating-linear-gradient(135deg,var(--border)_0_1px,transparent_1px_10px)]"
          />
        )}

        <div className="flex flex-1 flex-col p-6">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-accent">
            {PROJECT_TYPE_LABEL[project.type]}
          </p>

          <h3 className="mt-3 font-display text-lg font-semibold leading-snug">
            {project.title}
          </h3>

          {/* Only client work has a client to name, and the database enforces
              that. Printing it here is what makes the claim checkable. */}
          {project.client_name && (
            <p className="mt-1 text-sm text-text-muted">for {project.client_name}</p>
          )}

          {project.summary && (
            <p className="mt-3 flex-1 text-sm leading-relaxed text-text-muted">
              {project.summary}
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
