/**
 * A stable name for one screen.
 *
 * Stored in `profiles.menu_extra` / `profiles.menu_denied`, so these strings
 * are a small piece of schema: renaming one silently drops that screen from
 * the menu of everyone who had it granted or taken away. Rename the label
 * instead — that is what the label is for.
 */
export type MenuKey =
  | "dashboard"
  | "leads"
  | "pages"
  | "navigation"
  | "services"
  | "portfolio"
  | "case-studies"
  | "testimonials"
  | "blog"
  | "pricing"
  | "faqs"
  | "team"
  | "media"
  | "settings"
  | "seo"
  | "users"
  | "estate"
  | "studio"
  | "letterhead";

/**
 * A screen that lives inside another one.
 *
 * ---------------------------------------------------------------------------
 * **It has no key of its own, and that is the whole design.** A `MenuKey` is a
 * piece of schema — it is stored in `roles.default_menu` and in two arrays on
 * every profile — so giving the blog's categories screen a key of its own would
 * mean a migration, a new checkbox on the users screen, and a screen that is
 * invisible to everybody until somebody remembers to tick it. Worse, it would
 * be possible to grant "Blog" and deny "Blog categories", which is not a
 * permission anybody wants to express.
 *
 * A child is reachable exactly when its parent is. `requireMenu()` on the page
 * itself asks the parent's key, which is what those four pages already do.
 *
 * ---------------------------------------------------------------------------
 * **Why they are listed at all.** Six screens existed with no link in the
 * sidebar — the estate's three, the blog's categories and the enquiry sources —
 * reachable only from a link inside their parent page. The owner's complaint was
 * exactly that: *"sidebar me saare menu nahi aa raha h"*. A screen nobody can
 * find is a screen that was not built.
 */
export interface AdminNavChild {
  label: string;
  href: string;
}

export interface AdminNavItem {
  key: MenuKey;
  label: string;
  href: string;
  icon: string;
  /**
   * Screens only a role that carries `is_owner` may open.
   *
   * Only `users` is one, and it is not a grant that can be given out. Handing
   * someone the accounts screen is handing them every other screen — they
   * could raise their own role and take the rest — so it is not an extra, it
   * is what `is_owner` means. `profiles_owner_all` in the schema says the same
   * thing at the table, which is why granting it any other way would produce a
   * screen that loads and then refuses every action on it.
   */
  ownerOnly?: boolean;
  /** Not built yet. Rendered as a disabled row rather than a broken link. */
  planned?: boolean;

  /** Screens inside this one. Reachable exactly when this one is. */
  children?: AdminNavChild[];
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

/**
 * The admin menu.
 *
 * Declared as data rather than as markup so one list drives the sidebar, the
 * mobile menu, the per-person grants on the users screen, the route guards and
 * — when it exists — the command palette. Five copies of a menu drift, and the
 * one that drifts is always the one nobody looks at.
 *
 * What this list is *not* is who sees what. That moved to `company.roles` on
 * 2026-08-27: a role carries a default menu, and an individual differs from it
 * by two arrays on their profile. This file says which screens exist; the
 * database says who reaches them.
 *
 * Routes that are specified but not yet built are listed and disabled instead
 * of hidden. The owner should be able to see what this panel is going to be,
 * and a menu that grows an item a week reads as unfinished rather than as
 * progress. Delete the `planned` flag as each one lands.
 *
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", href: "/admin", icon: "layout-dashboard" },
      {
        key: "leads",
        label: "Enquiries",
        href: "/admin/leads",
        icon: "inbox",
        children: [{ label: "Where they came from", href: "/admin/leads/sources" }],
      },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "pages", label: "Pages", href: "/admin/pages", icon: "file-text" },
      { key: "navigation", label: "Navigation", href: "/admin/navigation", icon: "menu" },
      { key: "services", label: "Services", href: "/admin/services", icon: "boxes" },
      { key: "portfolio", label: "Portfolio", href: "/admin/portfolio", icon: "image" },
      { key: "case-studies", label: "Case studies", href: "/admin/case-studies", icon: "notebook" },
      { key: "testimonials", label: "Testimonials", href: "/admin/testimonials", icon: "quote" },
      {
        key: "blog",
        label: "Blog",
        href: "/admin/blog",
        icon: "pen-tool",
        children: [{ label: "Categories", href: "/admin/blog/categories" }],
      },
      { key: "pricing", label: "Pricing", href: "/admin/pricing", icon: "tag" },
      { key: "faqs", label: "FAQs", href: "/admin/faqs", icon: "help-circle" },
      { key: "team", label: "Team", href: "/admin/team", icon: "users" },
      { key: "media", label: "Media", href: "/admin/media", icon: "images" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { key: "settings", label: "Settings", href: "/admin/settings", icon: "settings-2" },
      { key: "seo", label: "SEO", href: "/admin/seo", icon: "search" },
      {
        key: "users",
        label: "Users",
        href: "/admin/users",
        icon: "user-cog",
        ownerOnly: true,
      },
    ],
  },
  {
    label: "Studio",
    items: [
      {
        /*
          Its own group, and its own key.

          The owner's instruction was specific: "ye wala menu alag banaya h …
          ho sakta h ye menu superadmin admin ko bhi na de, kisi manager ya TL
          ko de." A key is what makes that possible — it can be handed to one
          person and taken from another without touching anything else. Folded
          into Media or Settings it would travel with those for ever.

          So it is **grantable**, not `ownerOnly`. Who starts with it is decided
          in `lib/auth/roles.ts` and in the roles table, not here; the note there
          explains why an owner starts with it rather than being given it.
        */
        key: "studio",
        label: "Logo & banners",
        href: "/admin/studio",
        icon: "palette",
      },
      {
        /*
          The letterhead, and the letters written on it.

          In the Studio group because it is the same kind of thing — something
          the company produces rather than something the website shows — and
          its own key for the same reason the studio has one: writing a letter
          on company paper is a job for whoever does it, which is not
          necessarily whoever edits the blog.

          It reads `site_settings`, which is the point: the registered address
          and the CIN on the paper are the ones on the website, because they
          are the same row.
        */
        key: "letterhead",
        label: "Letterhead",
        href: "/admin/letterhead",
        icon: "file-signature",
      },
    ],
  },
  {
    label: "The estate",
    items: [
      {
        /*
          Phase 10, and the reason it is owner-only is the same as `users`.

          These screens read across every schema in the estate — six demos, the
          panel, and this website. Somebody who can see all of it can see every
          enquiry every business has ever received. That is not a grant to hand
          out screen by screen; it is what being accountable for the estate
          means, which is what `is_owner` already identifies.
        */
        key: "estate",
        label: "Estate",
        href: "/admin/estate",
        icon: "layers",
        ownerOnly: true,

        /*
          The three screens the estate actually consists of.

          They were reachable only from three links in the middle of
          `/admin/estate`, which meant the screen that decides who may open a
          demo — the one used in front of a prospect — took two clicks and a
          memory. They are children rather than keys for the reason the type
          above gives, and they are owner-only by inheritance: `requireMenu("estate")`
          at the top of each page is what actually refuses them.
        */
        children: [
          { label: "Who may open a demo", href: "/admin/estate/demos" },
          { label: "One inbox for everything", href: "/admin/estate/inbox" },
          { label: "Audit", href: "/admin/estate/audit" },
        ],
      },
    ],
  },
];

/** Every item, flattened, in the order they appear on screen. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);

/** One item by its key, or undefined if the key is no longer declared. */
export function navItem(key: string): AdminNavItem | undefined {
  return ADMIN_NAV_ITEMS.find((item) => item.key === key);
}
