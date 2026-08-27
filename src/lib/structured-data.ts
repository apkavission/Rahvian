import { SITE_URL } from "@/lib/env";
import { getSeoDefaults } from "@/lib/queries/seo";
import { getSiteSettings } from "@/lib/queries/site-settings";
import type { Service, ServiceSummary } from "@/lib/queries/services";

/**
 * JSON-LD builders.
 *
 * Structured data is the only part of the SEO layer that search engines read
 * as fact rather than as a hint. That makes accuracy the whole point: a field
 * is emitted only when the database actually holds a value for it. Padding the
 * graph with guesses — an invented rating, a placeholder address — is worse
 * than a smaller graph, because it is the kind of thing a manual review
 * penalises.
 *
 * Every builder returns a plain object. Rendering is left to `<JsonLd>` so the
 * escaping rule lives in exactly one place.
 */

type JsonLdObject = Record<string, unknown>;

/** Drops null, undefined and empty values so no key is emitted without a value. */
function compact(input: JsonLdObject): JsonLdObject {
  const output: JsonLdObject = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value as object).length === 0
    ) {
      continue;
    }
    output[key] = value;
  }

  return output;
}

/** Stable @id values, so the separate graphs on a page reference one another. */
const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * The company.
 *
 * `seo_defaults.organization_schema` wins outright when it holds anything. The
 * admin editing that field is doing so precisely because the generated version
 * is wrong for their case, so merging the two would put back what they removed.
 *
 * Which is exactly why it ships empty. An override seeded with values that
 * `site_settings` already holds looks harmless and is not: it silently freezes
 * the graph, so an owner who fills in a phone number, an address, a CIN or a
 * social profile sees none of it reach search engines and has no way to tell.
 * Found by filling in the settings form and reading the resulting page. The
 * field stays available for the case it was built for — a company whose graph
 * genuinely cannot be generated — and empty until then.
 */
export async function buildOrganizationSchema(): Promise<JsonLdObject | null> {
  const [settings, defaults] = await Promise.all([
    getSiteSettings(),
    getSeoDefaults(),
  ]);

  const override = defaults?.organization_schema;
  if (
    override &&
    typeof override === "object" &&
    !Array.isArray(override) &&
    Object.keys(override).length > 0
  ) {
    // `@context`, `@type`, `@id` and `url` are reapplied after the override
    // rather than before it. The other graphs on the page reference this node
    // by `@id`, so an override that omitted it would leave WebSite.publisher
    // and Service.provider pointing at nothing — the exact failure that makes
    // a structured-data report show an unresolved reference.
    return {
      "@context": "https://schema.org",
      ...(override as JsonLdObject),
      "@type": "Organization",
      "@id": ORGANIZATION_ID,
      url: SITE_URL,
    };
  }

  if (!settings) return null;

  const social = readSocialLinks(settings.social);

  const address = compact({
    "@type": "PostalAddress",
    streetAddress:
      [settings.address_line1, settings.address_line2]
        .filter(Boolean)
        .join(", ") || null,
    addressLocality: settings.city,
    addressRegion: settings.state,
    postalCode: settings.postal_code,
    addressCountry: settings.country,
  });

  return compact({
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: settings.company_name,
    legalName: settings.legal_name,
    // The hook line and the description are different claims. The tagline is
    // what the company says about itself in five words; the SEO description is
    // the sentence written to be read in a search result. Emitting the tagline
    // as both would repeat it rather than say two things.
    slogan: settings.tagline,
    description: defaults?.default_description ?? settings.tagline,
    url: SITE_URL,
    email: settings.email,
    telephone: settings.phone,
    // Only a street or a locality makes this worth emitting at all.
    address: Object.keys(address).length > 1 ? address : null,
    sameAs: social,
    // CIN and GST are the two identifiers that actually distinguish an Indian
    // company. Emitted as identifiers rather than invented properties.
    identifier: buildIdentifiers(settings.cin, settings.gst),
  });
}

function buildIdentifiers(
  cin: string | null,
  gst: string | null,
): JsonLdObject[] | null {
  const identifiers: JsonLdObject[] = [];

  if (cin) {
    identifiers.push({
      "@type": "PropertyValue",
      name: "CIN",
      value: cin,
    });
  }
  if (gst) {
    identifiers.push({
      "@type": "PropertyValue",
      name: "GSTIN",
      value: gst,
    });
  }

  return identifiers.length > 0 ? identifiers : null;
}

/** `social` is jsonb; accept an object of platform → url and keep real URLs only. */
function readSocialLinks(social: unknown): string[] {
  if (!social || typeof social !== "object" || Array.isArray(social)) return [];

  return Object.values(social as Record<string, unknown>).filter(
    (value): value is string =>
      typeof value === "string" && /^https?:\/\//.test(value),
  );
}

/** The site itself. Kept separate from Organization, as schema.org intends. */
export async function buildWebSiteSchema(): Promise<JsonLdObject | null> {
  const settings = await getSiteSettings();
  if (!settings) return null;

  return compact({
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: settings.company_name,
    url: SITE_URL,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-IN",
  });
}

/**
 * One service.
 *
 * `price_from` becomes an `offers` block only when the service is not marked
 * custom-quote. Publishing a starting price for something quoted per project
 * would be a promise the business has not made.
 */
export function buildServiceSchema(
  service: Service | ServiceSummary,
  path: string,
): JsonLdObject {
  const hasPrice =
    "price_from" in service &&
    service.price_from !== null &&
    !service.is_custom_quote;

  return compact({
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.summary,
    url: `${SITE_URL}${path}`,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: "India" },
    offers: hasPrice
      ? compact({
          "@type": "Offer",
          price: String(service.price_from),
          priceCurrency: "INR",
          description:
            "price_note" in service ? service.price_note : null,
          availability: "https://schema.org/InStock",
        })
      : null,
  });
}

/**
 * The trail shown in search results.
 *
 * Takes the trail already known to the route rather than deriving it from the
 * URL, because a path segment is not always a readable name — `/services/seo`
 * should read "SEO", not "Seo".
 */
export function buildBreadcrumbSchema(
  trail: Array<{ name: string; path: string }>,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

/** Questions and answers already on the page. Never invent entries here. */
export function buildFaqSchema(
  items: Array<{ question: string; answer: string }>,
): JsonLdObject | null {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

/**
 * One portfolio item.
 *
 * `CreativeWork` rather than a more specific type: a project here may be a
 * website, an application or a product, and claiming `SoftwareApplication` for
 * all of them would assert an install target most of them do not have.
 *
 * A client is named only when the row names one — which the database already
 * restricts to real client work — so this graph can never present a self-built
 * demo as an engagement. `dateCreated` is emitted from `year` alone, as a year
 * is all we actually know.
 */
export function buildProjectSchema(
  project: {
    title: string;
    summary: string;
    type: string;
    client_name: string | null;
    year: number | null;
    live_url: string | null;
    thumbnail: { url: string } | null;
  },
  path: string,
): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: `${SITE_URL}${path}`,
    creator: { "@id": ORGANIZATION_ID },
    image: project.thumbnail?.url ?? null,
    dateCreated: project.year ? String(project.year) : null,
    sameAs: project.live_url,
    // Only real client work has a client to name; the database enforces that.
    client:
      project.type === "client" && project.client_name
        ? { "@type": "Organization", name: project.client_name }
        : null,
  });
}

/**
 * One blog post.
 *
 * The author is the organisation, not a person: `profiles` is closed to the
 * anonymous role, so there is no public author record to point at, and naming
 * an individual here that the page itself does not show would be a claim with
 * nothing behind it.
 */
export function buildArticleSchema(
  post: {
    title: string;
    excerpt: string | null;
    seo_description: string | null;
    published_at: string | null;
    updated_at: string | null;
    seo_keywords: string[];
    image: { url: string } | null;
  },
  path: string,
): JsonLdObject {
  const url = `${SITE_URL}${path}`;

  return compact({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo_description ?? post.excerpt,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: post.image?.url ?? null,
    datePublished: post.published_at,
    // Only worth emitting when the post has actually been revised since.
    dateModified:
      post.updated_at && post.updated_at !== post.published_at ? post.updated_at : null,
    keywords: post.seo_keywords.length > 0 ? post.seo_keywords.join(", ") : null,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "en-IN",
  });
}

/**
 * One case study.
 *
 * `Article` rather than `CreativeWork`: a case study is a written account of a
 * project, and the project itself already has its own `CreativeWork` node on
 * the portfolio page. A client is named only when the row names one.
 */
export function buildCaseStudySchema(
  study: {
    title: string;
    problem: string | null;
    seo_description: string | null;
    client_name: string | null;
    industry: string | null;
    published_at: string | null;
    updated_at: string | null;
    image: { url: string } | null;
  },
  path: string,
): JsonLdObject {
  const url = `${SITE_URL}${path}`;

  return compact({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.seo_description ?? study.problem,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    image: study.image?.url ?? null,
    datePublished: study.published_at,
    dateModified:
      study.updated_at && study.updated_at !== study.published_at ? study.updated_at : null,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    about: study.industry ? { "@type": "Thing", name: study.industry } : null,
    mentions: study.client_name
      ? { "@type": "Organization", name: study.client_name }
      : null,
    inLanguage: "en-IN",
  });
}

/**
 * Our own product.
 *
 * No `aggregateRating` and no `offers` unless the page itself states a price —
 * a rating we have not collected is exactly the kind of invented field that
 * gets structured data ignored, and it is the field this type most invites.
 */
export function buildSoftwareApplicationSchema(
  product: {
    name: string;
    description: string;
    category?: string | null;
    operatingSystem?: string | null;
    url?: string | null;
  },
  path: string,
): JsonLdObject {
  return compact({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: product.name,
    description: product.description,
    url: `${SITE_URL}${path}`,
    applicationCategory: product.category ?? null,
    operatingSystem: product.operatingSystem ?? null,
    sameAs: product.url ?? null,
    publisher: { "@id": ORGANIZATION_ID },
  });
}
