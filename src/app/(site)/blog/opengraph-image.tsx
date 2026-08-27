import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

export const alt = "Blog — Apka Vission";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function BlogOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([getPage("blog"), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Blog"
        title={result?.page.title ?? "Blog"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
