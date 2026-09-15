/**
 * Cache tag registry.
 *
 * This is the mechanism that lets every piece of content be database-driven
 * while pages are still served as static HTML from the edge.
 *
 * Every read is wrapped in `unstable_cache` with a tag from this file and no
 * expiry. Every write calls `revalidateTag` with the tags it affects. Content
 * changes appear within seconds of saving; visitors never trigger a query.
 *
 * Tags are declared here, in one place, so invalidation is never guessed.
 * A mutation that invents its own tag string is a bug: the read that should
 * have been cleared will keep serving stale content indefinitely, and nothing
 * will fail loudly to tell you.
 */

export const CACHE_TAGS = {
  /** Logo, contact details, social links, theme defaults, feature toggles. */
  siteSettings: "site-settings",

  /** Header, footer and mobile menus. */
  navigation: "navigation",

  /** The role master list: labels, capabilities and default menus. */
  roles: "roles",

  /**
   * The demos that are open to anybody, as the website shows them.
   *
   * Read from `control.public_demos()`, which crosses six schemas — so it is
   * cached, and this is the tag the estate screen's visibility switch clears.
   */
  demos: "demos",

  /** Title template, default description, verification codes. */
  seoDefaults: "seo-defaults",

  /** Path redirect table. Nothing reads it yet — see pre-production-cleanup.md §5. */
  redirects: "redirects",

  /** Any page or page section. */
  pages: "pages",

  /** One page and its sections. */
  page: (slug: string) => `page:${slug}`,

  /** The service list. */
  services: "services",

  /** One service detail page. */
  service: (slug: string) => `service:${slug}`,

  /** Portfolio, all types. */
  projects: "projects",

  /** One portfolio item. */
  project: (slug: string) => `project:${slug}`,

  /** Case study index. */
  caseStudies: "case-studies",

  /** One case study. */
  caseStudy: (slug: string) => `case-study:${slug}`,

  /** Blog index, categories and featured lists. */
  blog: "blog",

  /** One post. */
  post: (slug: string) => `post:${slug}`,

  /** Editable copy for transactional emails. */
  emailTemplates: "email-templates",

  faqs: "faqs",
  technologies: "technologies",
  processSteps: "process",
  pricing: "pricing",
  testimonials: "testimonials",
  team: "team",
  media: "media",
} as const;

/**
 * Tags to clear when a given entity changes.
 *
 * Mutations call this rather than listing tags by hand, so a write can never
 * clear a page's own cache while leaving the index that lists it stale.
 * Every list a record appears in is included here.
 */
export const INVALIDATION_MAP = {
  siteSettings: () => [CACHE_TAGS.siteSettings],

  navigation: () => [CACHE_TAGS.navigation],

  // A role change moves people between menus, so nothing static depends on it
  // — but the admin shell reads the list on every request and would otherwise
  // keep resolving menus from the version before the edit.
  roles: () => [CACHE_TAGS.roles],

  seoDefaults: () => [CACHE_TAGS.seoDefaults],

  redirects: () => [CACHE_TAGS.redirects],

  page: (slug: string) => [CACHE_TAGS.pages, CACHE_TAGS.page(slug)],

  // A service change alters its own page, the services index, and the home
  // page's services grid, which reads the same list.
  service: (slug: string) => [
    CACHE_TAGS.services,
    CACHE_TAGS.service(slug),
    CACHE_TAGS.page("home"),
  ],

  // A portfolio item appears on its own page, the portfolio index, the demos
  // index, and the home page.
  project: (slug: string) => [
    CACHE_TAGS.projects,
    CACHE_TAGS.project(slug),
    CACHE_TAGS.page("home"),
  ],

  caseStudy: (slug: string) => [CACHE_TAGS.caseStudies, CACHE_TAGS.caseStudy(slug)],

  post: (slug: string) => [CACHE_TAGS.blog, CACHE_TAGS.post(slug)],

  faqs: () => [CACHE_TAGS.faqs, CACHE_TAGS.pages],

  technologies: () => [CACHE_TAGS.technologies, CACHE_TAGS.page("home")],

  processSteps: () => [CACHE_TAGS.processSteps, CACHE_TAGS.page("home")],

  pricing: () => [CACHE_TAGS.pricing],

  testimonials: () => [CACHE_TAGS.testimonials, CACHE_TAGS.pages],

  team: () => [CACHE_TAGS.team, CACHE_TAGS.page("about")],

  // Media is referenced from everywhere. A replaced image has to clear the lot.
  media: () => [
    CACHE_TAGS.media,
    CACHE_TAGS.siteSettings,
    CACHE_TAGS.pages,
    CACHE_TAGS.services,
    CACHE_TAGS.projects,
    CACHE_TAGS.blog,
  ],
} as const;
