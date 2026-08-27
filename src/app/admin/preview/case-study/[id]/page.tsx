import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CaseStudyDetail, readGallery } from "@/components/case-studies/case-study-detail";
import { requireMenu } from "@/lib/auth/session";
import { getAdminCaseStudy } from "@/lib/queries/case-studies-admin";
import { getCaseStudies } from "@/lib/queries/case-studies";
import { getMediaByIds } from "@/lib/queries/projects";
import { getAdminTechnologies } from "@/lib/queries/technologies";

export const metadata: Metadata = {
  title: "Case study preview",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A case study as it will look, including what is not published yet.
 *
 * The same `CaseStudyDetail` the public route renders, so this is the page
 * rather than a drawing of it. The study itself is read uncached, as the
 * signed-in user, which is what makes a draft visible at all; the "more
 * reading" strip and the screenshot images come from the public, cached
 * queries, because both should show only what a visitor would be shown.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it.
 */
export default async function CaseStudyPreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMenu("case-studies");

  const { id } = await params;
  const study = await getAdminCaseStudy(id);

  if (!study) notFound();

  const screenshots = readGallery(study.screenshots);

  const [technologies, published, media] = await Promise.all([
    getAdminTechnologies(),
    getCaseStudies(),
    getMediaByIds(screenshots.map((item) => item.media_id)),
  ]);

  const wanted = new Set(study.technology_ids);
  const others = published.filter((other) => other.slug !== study.slug).slice(0, 3);

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {study.title} · {study.status}
        </p>
      </div>

      <CaseStudyDetail
        study={study}
        technologies={technologies.filter((tech) => wanted.has(tech.id))}
        media={media}
        others={others}
      />
    </div>
  );
}
