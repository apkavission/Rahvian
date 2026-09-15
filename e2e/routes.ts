/**
 * The routes the specs walk.
 *
 * Written out rather than read from the sitemap, and that is deliberate: while
 * `site_noindex` is on — which is the current, correct, pre-launch state — the
 * sitemap is an empty urlset. A suite that discovered its own work from it
 * would pass by testing nothing, on exactly the day it matters most.
 */

/** Public pages that exist whether or not any content has been entered. */
export const PUBLIC_ROUTES = [
  { path: "/", name: "Home" },
  { path: "/about", name: "About" },
  { path: "/services", name: "Services" },
  { path: "/portfolio", name: "Portfolio" },
  { path: "/case-studies", name: "Case studies" },
  { path: "/blog", name: "Blog" },
  { path: "/blog/category/building-software", name: "Blog category" },
  { path: "/pricing", name: "Pricing" },
  { path: "/contact", name: "Contact" },
  { path: "/request-a-quote", name: "Request a quote" },
  { path: "/privacy-policy", name: "Privacy policy" },
  { path: "/terms-and-conditions", name: "Terms" },
];

/**
 * Pages that exist only once something has been published from the admin.
 *
 * Added 2026-08-28, the day the site was first filled with content, and added
 * because of what filling it found: `/blog/category/...` skipped from `h1`
 * straight to `h3` the moment a post appeared under it. The accessibility spec
 * had walked that page on every run for days and passed, because an empty
 * archive has no card headings to get wrong.
 *
 * **An empty page is not the page.** These routes are the ones a reader
 * actually meets, and a suite that only ever walks the empty state is a suite
 * that reports on a version of the site nobody visits.
 *
 * They depend on records existing, so they are a separate list: if the content
 * is ever cleared these fail loudly rather than silently testing nothing, which
 * is the same reason the routes above are written out instead of read from the
 * sitemap.
 */
export const CONTENT_ROUTES = [
  /* One portfolio entry, not two: the company's own product was removed on
     2026-09-11 along with its portfolio piece, and the remaining entry — this
     website — was re-slugged with the company's new name. */
  { path: "/portfolio/rahvian", name: "Portfolio entry" },
  { path: "/case-studies/editable-company-website", name: "Case study" },
  { path: "/blog/website-should-not-need-a-developer", name: "Blog post" },
  { path: "/blog/three-layers-of-access-control", name: "Blog post" },
  { path: "/blog/category/for-business-owners", name: "Blog category with posts" },
];

/**
 * The seven seeded services.
 *
 * Their pages are prerendered from the database, so a slug that stops existing
 * fails these specs — which is the point. A service renamed in the admin
 * without its old address being redirected is a link somebody has already sent.
 */
export const SERVICE_ROUTES = [
  "/services/web-development",
  "/services/web-application-development",
  "/services/mobile-app-development",
  "/services/custom-software-development",
  "/services/ai-development",
  "/services/seo",
  "/services/digital-marketing",
];

/**
 * A slug no service has, and never will.
 *
 * Its own constant because it is not a typo waiting to be corrected: it is the
 * input to the soft-404 assertion, and the first list written here got three
 * slugs wrong and **still passed** — which is how the soft 404 was found at
 * all. A made-up service address answered 200.
 */
export const MISSING_SLUGS = [
  "/services/no-such-service",
  "/portfolio/no-such-project",
  "/case-studies/no-such-study",
  "/blog/no-such-post",
  "/blog/category/no-such-category",
];

/**
 * Every admin address, including the ones behind a menu nobody may have.
 *
 * Signed out, every one of them must turn into the login screen. That is the
 * middleware's job and it is the cheapest security assertion in the suite: the
 * failure it catches — one route added without the guard — is invisible until
 * somebody finds it.
 */
export const ADMIN_ROUTES = [
  "/admin",
  "/admin/leads",
  "/admin/pages",
  "/admin/navigation",
  "/admin/services",
  "/admin/portfolio",
  "/admin/case-studies",
  "/admin/testimonials",
  "/admin/blog",
  "/admin/blog/categories",
  "/admin/pricing",
  "/admin/faqs",
  "/admin/team",
  "/admin/media",
  "/admin/settings",
  "/admin/seo",
  "/admin/users",
  "/admin/account",
  "/admin/preview/faqs",
  "/admin/preview/navigation",
  "/admin/preview/pricing",
  "/admin/preview/team",
];

/**
 * The widths every screen is checked at.
 *
 * The six from [responsive-rules.md](../docs/responsive-rules.md), which calls
 * this a release blocker rather than a polish pass. 360 is the narrowest phone
 * still in use and the one that breaks first.
 */
export const WIDTHS = [360, 390, 768, 1024, 1280, 1440];

/**
 * Where the signed-in session is kept between the setup project and the specs
 * that need it. Git-ignored: it is a real session cookie for a real account.
 */
export const STORAGE_STATE = "e2e/.auth/owner.json";

/**
 * The admin screens a signed-in owner can open, and the heading each shows.
 *
 * The heading rather than just the status, because every one of these renders
 * from a database read that can legitimately return nothing — a screen that
 * answers 200 with an empty shell is the failure worth catching, and it is
 * invisible to a status check.
 */
export const ADMIN_SCREENS: {
  path: string;
  heading: string | RegExp;
  /**
   * The sidebar link that leads here, when there is one.
   *
   * Most screens are their own menu item and their heading is its label, so
   * this is left out. Where a screen lives inside another one its sidebar row
   * is a child link with a label of its own — "Who may open a demo" under
   * Estate, "Categories" under Blog — and that label is what goes here, because
   * the heading and the row are allowed to read differently.
   *
   * `null` means a screen with no row of its own at all. Nothing is `null` any
   * more: until 2026-09-12 the estate's three pages were, and the sidebar was
   * the poorer for it — they were reachable only from three links in the middle
   * of the estate screen, which is how "sidebar me saare menu nahi aa raha h"
   * happened.
   */
  nav?: string | null;
}[] = [
  // The dashboard greets the person by name and falls back to "Dashboard" only
  // for an account with none, so this is the one heading that is not fixed.
  { path: "/admin", heading: /^(Dashboard|Hello,)/ },
  { path: "/admin/leads", heading: "Enquiries" },
  {
    path: "/admin/leads/sources",
    heading: "Where enquiries come from",
    nav: "Where they came from",
  },
  { path: "/admin/pages", heading: "Pages" },
  { path: "/admin/navigation", heading: "Navigation" },
  { path: "/admin/services", heading: "Services" },
  { path: "/admin/portfolio", heading: "Portfolio" },
  { path: "/admin/case-studies", heading: "Case studies" },
  { path: "/admin/testimonials", heading: "Testimonials" },
  { path: "/admin/blog", heading: "Blog" },
  { path: "/admin/blog/categories", heading: "Categories", nav: "Categories" },
  { path: "/admin/pricing", heading: "Pricing" },
  { path: "/admin/faqs", heading: "FAQs" },
  { path: "/admin/team", heading: "Team" },
  { path: "/admin/media", heading: "Media" },
  { path: "/admin/settings", heading: "Settings" },
  { path: "/admin/seo", heading: "SEO" },
  { path: "/admin/users", heading: "Users" },
  { path: "/admin/account", heading: "Your account" },

  /*
    The estate screens, which are one menu key with three pages under it.

    They were left off this list until 2026-09-03, so the suite reported every
    admin screen opening while three of the most powerful ones were never
    requested. A list of screens that quietly omits some is worse than a shorter
    honest one, because the number at the end of a run is believed.
  */
  { path: "/admin/estate", heading: "The estate", nav: "Estate" },
  { path: "/admin/estate/inbox", heading: "One inbox", nav: "One inbox for everything" },
  { path: "/admin/estate/audit", heading: "What was done", nav: "Audit" },
  { path: "/admin/estate/demos", heading: "Who may open a demo", nav: "Who may open a demo" },

  /* Its own menu key, granted per person — see 20260903000029. */
  { path: "/admin/studio", heading: "Logo & banners", nav: "Logo & banners" },

  /* Missing from this list until 2026-09-12, which is the failure the note at
     the top of the estate block describes: a suite reporting that every admin
     screen opens while never requesting this one. */
  { path: "/admin/letterhead", heading: "Letterhead", nav: "Letterhead" },
];
