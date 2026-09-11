import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getSeoDefaults } from "@/lib/queries/seo";
import { getBlogPosts } from "@/lib/queries/blog";
import { getCaseStudies } from "@/lib/queries/case-studies";
import { getProjects } from "@/lib/queries/projects";
import { getServices } from "@/lib/queries/services";

/**
 * The sitemap, built from the same database the pages are.
 *
 * Publishing a service, a post or a case study adds it here on the next
 * revalidation, so the sitemap cannot drift from what is actually served —
 * the failure mode a hand-written one always eventually reaches.
 *
 * While `site_noindex` is on, the sitemap is emitted empty rather than
 * omitted. An empty urlset is an unambiguous "nothing to crawl yet"; a 404
 * looks like a misconfiguration and gets retried.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [defaults, services, projects, posts, caseStudies] = await Promise.all([
    getSeoDefaults(),
    getServices(),
    getProjects(),
    getBlogPosts(),
    getCaseStudies(),
  ]);

  if (defaults?.site_noindex) return [];

  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/services`, changeFrequency: "monthly", priority: 0.9 },
    ...services.map((service) => ({
      url: `${SITE_URL}/services/${service.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${SITE_URL}/portfolio`, changeFrequency: "monthly" as const, priority: 0.8 },
    ...projects.map((project) => ({
      url: `${SITE_URL}/portfolio/${project.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${SITE_URL}/case-studies`, changeFrequency: "monthly" as const, priority: 0.7 },
    ...caseStudies.map((study) => ({
      url: `${SITE_URL}/case-studies/${study.slug}`,
      lastModified: study.published_at ? new Date(study.published_at) : undefined,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.7 },
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : undefined,
      changeFrequency: "yearly" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/about`, changeFrequency: "yearly" as const, priority: 0.6 },
    { url: `${SITE_URL}/contact`, changeFrequency: "yearly" as const, priority: 0.7 },
    // Legal pages are listed at the lowest priority rather than left out. They
    // are rarely the page anyone searches for, but a policy that cannot be
    // found is a policy that does not do its job.
    { url: `${SITE_URL}/privacy-policy`, changeFrequency: "yearly" as const, priority: 0.3 },
    {
      url: `${SITE_URL}/terms-and-conditions`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];
}
