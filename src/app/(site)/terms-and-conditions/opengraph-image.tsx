import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

export const alt = "Legal — Rahvian";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function TermsOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([getPage("terms-and-conditions"), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Legal"
        title={result?.page.title ?? "Terms and conditions"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
