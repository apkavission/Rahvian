import { ImageResponse } from "next/og";
import { OG_SIZE, OgCard, readLogoDataUri } from "@/lib/og-template";
import { getService, getServices } from "@/lib/queries/services";
import { SITE_URL } from "@/lib/env";

/**
 * A card per service, so a shared service link previews with that service's
 * own name and summary rather than the generic site card.
 */
export const alt = "Apka Vission service";
export const size = OG_SIZE;
export const contentType = "image/png";

/** Prerendered alongside the pages themselves, from the same slug list. */
export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export default async function ServiceOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [service, logoDataUri] = await Promise.all([
    getService(slug),
    readLogoDataUri(),
  ]);

  return new ImageResponse(
    (
      <OgCard
        eyebrow="Services"
        title={service?.name ?? "Services"}
        description={service?.summary}
        footer={SITE_URL.replace(/^https?:\/\//, "")}
        logoDataUri={logoDataUri}
      />
    ),
    size,
  );
}
