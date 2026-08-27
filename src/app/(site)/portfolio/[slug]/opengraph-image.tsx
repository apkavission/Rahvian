import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getProject } from "@/lib/queries/projects";
import { SITE_URL } from "@/lib/env";

export const alt = "Portfolio — Apka Vission";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * One card per project, carrying the project's own title and summary.
 *
 * The eyebrow names the kind of work rather than saying "Portfolio", so a
 * shared link cannot imply that a self-built demo was a client engagement.
 */
export default async function ProjectOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [project, logoDataUri] = await Promise.all([getProject(slug), readLogoDataUri()]);

  const eyebrow =
    project?.type === "client"
      ? "Client project"
      : project?.type === "demo"
        ? "Self-built demo"
        : project?.type === "inhouse"
          ? "Our own product"
          : "Portfolio";

  return new ImageResponse(
    (
      <OgCard
        eyebrow={eyebrow}
        title={project?.title ?? "Portfolio"}
        description={project?.seo_description ?? project?.summary}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
