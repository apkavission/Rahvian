import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectDetail, readGallery } from "@/components/portfolio/project-detail";
import { requireStaff } from "@/lib/auth/session";
import { getAdminProject } from "@/lib/queries/projects-admin";
import { getMediaByIds, getProjects } from "@/lib/queries/projects";
import { getAdminTechnologies } from "@/lib/queries/technologies";

export const metadata: Metadata = {
  title: "Portfolio preview",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A portfolio page as it will look, including what is not published yet.
 *
 * The same `ProjectDetail` the public route renders, so this is the page rather
 * than a drawing of it. Two differences, both necessary:
 *
 *   Drafts render. That is the point — the item nobody can see yet is exactly
 *   the one that needs looking at.
 *
 *   The item itself is read uncached, as the signed-in user, so RLS hands back
 *   the draft the anonymous cached query correctly refuses.
 *
 * The "more work" strip and the gallery images deliberately come from the
 * public, cached queries. Both show only what a visitor would be shown — a
 * draft in that strip would be previewing links that 404 from inside the
 * preview — and media rows have no draft state to hide.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it:
 * this is loaded in an iframe beside the editor, and a sidebar inside a preview
 * pane is a sidebar twice.
 */
export default async function ProjectPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The admin layout does not wrap this route, so it establishes the session
  // for itself. A preview of an unpublished project is not public content.
  await requireStaff();

  const { id } = await params;
  const project = await getAdminProject(id);

  if (!project) notFound();

  const gallery = readGallery(project.gallery);

  const [technologies, published, media] = await Promise.all([
    getAdminTechnologies(),
    getProjects(),
    getMediaByIds(gallery.map((item) => item.media_id)),
  ]);

  const wanted = new Set(project.technology_ids);
  const others = published.filter((other) => other.slug !== project.slug).slice(0, 3);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {project.title} · {project.status}
        </p>
      </div>

      <ProjectDetail
        project={project}
        technologies={technologies.filter((tech) => wanted.has(tech.id))}
        media={media}
        others={others}
      />
    </div>
  );
}
