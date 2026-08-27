import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { JsonLd } from "@/components/seo/json-ld";
import { ServiceDetail } from "@/components/services/service-detail";
import { getService, getServices } from "@/lib/queries/services";
import { getTechnologiesByIds } from "@/lib/queries/technologies";
import { buildMetadata } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildServiceSchema,
} from "@/lib/structured-data";

type Params = { params: Promise<{ slug: string }> };

/**
 * Prerender every published service at build time.
 *
 * `dynamicParams` stays at its default of true, so a service published from
 * the admin between deploys is still served — rendered once on first request
 * and cached from then on, rather than 404ing until someone redeploys.
 */
export async function generateStaticParams() {
  const services = await getServices();
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const service = await getService(slug);

  if (!service) return buildMetadata({ title: "Not found", path: `/services/${slug}`, noindex: true });

  return buildMetadata({
    title: service.seo_title ?? service.name,
    description: service.seo_description ?? service.summary,
    path: `/services/${service.slug}`,
    keywords: service.seo_keywords,
    noindex: service.noindex,
    canonical: service.canonical_url,
  });
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const service = await getService(slug);

  // RLS restricts this read to published rows, so a draft slug lands here too.
  if (!service) notFound();

  const [technologies, all] = await Promise.all([
    getTechnologiesByIds(service.technology_ids),
    getServices(),
  ]);

  const others = all.filter((other) => other.slug !== service.slug);
  const path = `/services/${service.slug}`;

  return (
    <>
      <JsonLd data={buildServiceSchema(service, path)} />
      <JsonLd
        data={buildBreadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.short_name ?? service.name, path },
        ])}
      />

      {/*
        The page itself is a component, shared with the admin's preview. The
        two routes differ in how they read — cached and anonymous here, uncached
        and as the signed-in user there, so a draft can be looked at — and in
        nothing else. That is the whole point: what the editor sees beside the
        form is what a visitor gets.
      */}
      <ServiceDetail service={service} technologies={technologies} others={others} />
    </>
  );
}
