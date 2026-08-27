import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

export const alt = "Portfolio — Apka Vission";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function PortfolioOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([getPage("portfolio"), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Portfolio"
        title={result?.page.title ?? "Work"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
