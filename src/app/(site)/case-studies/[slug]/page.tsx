import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CaseStudyDetail, readGallery } from "@/components/case-studies/case-study-detail";
import { JsonLd } from "@/components/seo/json-ld";
import { getCaseStudies, getCaseStudy } from "@/lib/queries/case-studies";
import { getMediaByIds } from "@/lib/queries/projects";
import { getTechnologiesByIds } from "@/lib/queries/technologies";
import { buildMetadata } from "@/lib/seo";
import { buildBreadcrumbSchema, buildCaseStudySchema } from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

/**
 * Prerender every published case study.
 *
 * `dynamicParams` stays at its default of true, so one published from the
 * admin between deploys is served on first request.
 */
export async function generateStaticParams() {
  const studies = await getCaseStudies();
  return studies.map((study) => ({ slug: study.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const study = await getCaseStudy(slug);

  if (!study) {
    return buildMetadata({ title: "Not found", path: `/case-studies/${slug}`, noindex: true });
  }

  return buildMetadata({
    title: study.seo_title ?? study.title,
    description: study.seo_description ?? study.problem,
    path: `/case-studies/${study.slug}`,
    keywords: study.seo_keywords,
    noindex: study.noindex,
    canonical: study.canonical_url,
  });
}

export default async function CaseStudyPage({ params }: Params) {
  const { slug } = await params;
  const study = await getCaseStudy(slug);

  // RLS restricts this read to published rows, so a draft slug lands here too.
  if (!study) notFound();

  const screenshots = readGallery(study.screenshots);

  const [technologies, all, media] = await Promise.all([
    getTechnologiesByIds(study.technology_ids),
    getCaseStudies(),
    getMediaByIds(screenshots.map((item) => item.media_id)),
  ]);

  const others = all.filter((other) => other.slug !== study.slug).slice(0, 3);
  const path = `/case-studies/${study.slug}`;

  return (
    <>
      <JsonLd data={buildCaseStudySchema(study, path)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Case studies", path: "/case-studies" },
          { name: study.title, path },
        ])}
      />

      {/*
        The page itself is a component, shared with the admin's preview. The two
        routes differ in how they read — cached and anonymous here, uncached and
        as the signed-in user there, so a draft can be looked at — and in nothing
        else.
      */}
      <CaseStudyDetail
        study={study}
        technologies={technologies}
        media={media}
        others={others}
      />
    </>
  );
}
