import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getSeoDefaults } from "@/lib/queries/seo";
import { getSiteSettings } from "@/lib/queries/site-settings";
import { SITE_URL } from "@/lib/env";

/**
 * The card every public route falls back to.
 *
 * Lives in the `(site)` group rather than at the app root. A root-level image
 * did not reach these routes once their own `generateMetadata` returned an
 * explicit `openGraph` object; placed here it applies to the whole group,
 * which is also the right scope — the admin and portal routes should not
 * preview as the marketing site.
 */
export const alt = "Apka Vission — Your Vision. We Make It Happen.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function OpengraphImage() {
  const [settings, defaults, logoDataUri] = await Promise.all([
    getSiteSettings(),
    getSeoDefaults(),
    readLogoDataUri(),
  ]);

  return new ImageResponse(
    (
      <OgCard
        title={settings?.tagline ?? "Your Vision. We Make It Happen."}
        description={defaults?.default_description}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
