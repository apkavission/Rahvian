import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { SITE_URL } from "@/lib/env";

/**
 * The quote page card.
 *
 * Declared per segment for the same reason as the services one: an explicit
 * `openGraph` in `generateMetadata` stops a parent segment's image from
 * applying.
 */
export const alt = "Request a quote — Rahvian";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function QuoteOpengraphImage() {
  const logoDataUri = await readLogoDataUri();

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Request a quote"
        title="Tell us what you are building"
        description="A scope, a timeline and a price within one working day — not a call booking link."
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
