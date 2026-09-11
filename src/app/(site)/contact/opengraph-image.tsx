import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

export const alt = "Contact — Rahvian";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ContactOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([getPage("contact"), readLogoDataUri()]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Contact"
        title={result?.page.title ?? "Talk to us"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
