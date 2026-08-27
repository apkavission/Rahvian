import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProjectDetail, readGallery } from "@/components/portfolio/project-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { getMediaByIds, getProject, getProjects } from "@/lib/queries/projects";
import { getTechnologiesByIds } from "@/lib/queries/technologies";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildProjectSchema } from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

/**
 * Prerender every published project.
 *
 * `dynamicParams` stays at its default of true, so a project published from
 * the admin between deploys is served on first request rather than 404ing
 * until someone redeploys.
 */
export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    return buildMetadata({ title: "Not found", path: `/portfolio/${slug}`, noindex: true });
  }

  return buildMetadata({
    title: project.seo_title ?? project.title,
    description: project.seo_description ?? project.summary,
    path: `/portfolio/${project.slug}`,
    keywords: project.seo_keywords,
    noindex: project.noindex,
    canonical: project.canonical_url,
  });
}

export default async function ProjectPage({ params }: Params) {
  const { slug } = await params;
  const project = await getProject(slug);

  // RLS restricts this read to published rows, so a draft slug lands here too.
  if (!project) notFound();

  const gallery = readGallery(project.gallery);

  const [technologies, all, media] = await Promise.all([
    getTechnologiesByIds(project.technology_ids),
    getProjects(),
    getMediaByIds(gallery.map((item) => item.media_id)),
  ]);

  const others = all.filter((other) => other.slug !== project.slug).slice(0, 3);
  const path = `/portfolio/${project.slug}`;

  return (
    <>
      <JsonLd data={buildProjectSchema(project, path)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Portfolio", path: "/portfolio" },
          { name: project.title, path },
        ])}
      />

      {/*
        The page itself is a component, shared with the admin's preview. The two
        routes differ in how they read — cached and anonymous here, uncached and
        as the signed-in user there, so a draft can be looked at — and in nothing
        else. That is the whole point: what the editor sees beside the form is
        what a visitor gets.
      */}
      <ProjectDetail
        project={project}
        technologies={technologies}
        media={media}
        others={others}
      />
    </>
  );
}
