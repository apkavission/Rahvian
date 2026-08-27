import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ServiceDetail } from "@/components/services/service-detail";
import { requireMenu } from "@/lib/auth/session";
import { getAdminService, getAdminServices } from "@/lib/queries/services-admin";
import { getAdminTechnologies } from "@/lib/queries/technologies";

export const metadata: Metadata = {
  title: "Service preview",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * A service page as it will look, including what is not published yet.
 *
 * The same `ServiceDetail` the public route renders, so this is the page rather
 * than a drawing of it. Two differences, both necessary:
 *
 *   Drafts render. That is the point — the service nobody can see yet is
 *   exactly the one that needs looking at.
 *
 *   The reads are uncached and made as the signed-in user, so RLS hands back
 *   the draft the anonymous cached query correctly refuses.
 *
 * It sits outside the `(dashboard)` group so the admin chrome does not wrap it:
 * this is loaded in an iframe beside the editor, and a sidebar inside a preview
 * pane is a sidebar twice.
 */
export default async function ServicePreview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // The admin layout does not wrap this route, so it establishes the session
  // for itself. A preview of an unpublished service is not public content.
  await requireMenu("services");

  const { id } = await params;
  const service = await getAdminService(id);

  if (!service) notFound();

  const [technologies, all] = await Promise.all([
    getAdminTechnologies(),
    getAdminServices(),
  ]);

  const wanted = new Set(service.technology_ids);

  // "Other services" shows what a visitor would see there — published only.
  // Listing the drafts alongside would be previewing a page that will never
  // exist, and the links would 404 from inside the preview.
  const others = all
    .filter((other) => other.id !== service.id && other.status === "published")
    .map((other) => ({
      id: other.id,
      slug: other.slug,
      name: other.name,
      summary: other.summary,
    }));

  return (
    <div className="min-h-dvh bg-bg">
      <div className="border-b border-border bg-surface-2 px-4 py-2">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
          Preview · {service.name} · {service.status}
        </p>
      </div>

      <ServiceDetail
        service={service}
        technologies={technologies.filter((tech) => wanted.has(tech.id))}
        others={others}
      />
    </div>
  );
}
