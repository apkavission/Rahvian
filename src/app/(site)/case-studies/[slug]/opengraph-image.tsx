import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getCaseStudy } from "@/lib/queries/case-studies";
import { SITE_URL } from "@/lib/env";

export const alt = "Case study — Apka Vission";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * One card per case study.
 *
 * The eyebrow says "Case study" rather than naming the client: a client is
 * named on the page itself, where the work is described, not in the one line
 * that travels furthest.
 */
export default async function CaseStudyOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [study, logoDataUri] = await Promise.all([getCaseStudy(slug), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Case study"
        title={study?.title ?? "Case study"}
        description={study?.seo_description ?? study?.problem}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
