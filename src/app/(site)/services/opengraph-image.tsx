import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getPage } from "@/lib/queries/page";
import { SITE_URL } from "@/lib/env";

/**
 * The services index card.
 *
 * Present as its own file rather than inherited from the group: a route whose
 * `generateMetadata` returns an explicit `openGraph` object does not pick up a
 * parent segment's image, only one in its own segment. Every route here goes
 * through `buildMetadata`, so every route that wants a card declares one.
 */
export const alt = "Services — Apka Vission";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function ServicesOpengraphImage() {
  const [result, logoDataUri] = await Promise.all([
    getPage("services"),
    readLogoDataUri(),
  ]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Services"
        title={result?.page.title ?? "What we build"}
        description={result?.page.seo_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
