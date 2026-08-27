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
  | "blog"
  | "pricing"
  | "faqs"
  | "team"
  | "media"
  | "settings"
  | "seo"
  | "users";

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
      { key: "leads", label: "Enquiries", href: "/admin/leads", icon: "inbox" },
    ],
  },
  {
    label: "Content",
    items: [
      { key: "pages", label: "Pages", href: "/admin/pages", icon: "file-text" },
      { key: "navigation", label: "Navigation", href: "/admin/navigation", icon: "menu", planned: true },
      { key: "services", label: "Services", href: "/admin/services", icon: "boxes" },
      { key: "portfolio", label: "Portfolio", href: "/admin/portfolio", icon: "image" },
      { key: "case-studies", label: "Case studies", href: "/admin/case-studies", icon: "notebook" },
      { key: "blog", label: "Blog", href: "/admin/blog", icon: "pen-tool" },
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
      { key: "seo", label: "SEO", href: "/admin/seo", icon: "search", planned: true },
      {
        key: "users",
        label: "Users",
        href: "/admin/users",
        icon: "user-cog",
        ownerOnly: true,
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
