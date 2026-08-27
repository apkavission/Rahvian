import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

export const alt = "Our product — Apka Vission";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ApkaSaathiOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([getPage("products-apka-saathi"), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Our product"
        title={result?.page.title ?? "Apka Saathi"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
