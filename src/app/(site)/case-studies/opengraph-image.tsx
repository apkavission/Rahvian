import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

export const alt = "Case studies — Rahvian";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function CaseStudiesOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([getPage("case-studies"), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Case studies"
        title={result?.page.title ?? "Case studies"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
