import type { Role } from "@/lib/auth/session";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: string;
  /** Roles allowed to see it. Omitted means every staff role. */
  roles?: Role[];
  /** Not built yet. Rendered as a disabled row rather than a broken link. */
  planned?: boolean;
}

export interface AdminNavGroup {
  label: string;
  items: AdminNavItem[];
}

const LEAD_ROLES: Role[] = ["super_admin", "owner", "admin"];
const OWNER_ROLES: Role[] = ["super_admin", "owner"];

/**
 * The admin menu.
 *
 * Declared as data rather than as markup so one list drives the sidebar, the
 * mobile menu and — when it exists — the command palette. Three copies of a
 * menu drift, and the one that drifts is always the one nobody looks at.
 *
 * Routes that are specified but not yet built are listed and disabled instead
 * of hidden. The owner should be able to see what this panel is going to be,
 * and a menu that grows an item a week reads as unfinished rather than as
 * progress. Delete the `planned` flag as each one lands.
 *
 * Visibility follows the roles in spec §15.2 and mirrors the RLS helpers:
 * editors do not see leads, because content access must not imply access to
 * commercial data.
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: "layout-dashboard" },
      { label: "Enquiries", href: "/admin/leads", icon: "inbox", roles: LEAD_ROLES },
    ],
  },
  {
    label: "Content",
    items: [
      { label: "Pages", href: "/admin/pages", icon: "file-text" },
      { label: "Navigation", href: "/admin/navigation", icon: "menu", planned: true },
      { label: "Services", href: "/admin/services", icon: "boxes" },
      { label: "Portfolio", href: "/admin/portfolio", icon: "image" },
      { label: "Case studies", href: "/admin/case-studies", icon: "notebook" },
      { label: "Blog", href: "/admin/blog", icon: "pen-tool" },
      { label: "Pricing", href: "/admin/pricing", icon: "tag" },
      { label: "FAQs", href: "/admin/faqs", icon: "help-circle" },
      { label: "Team", href: "/admin/team", icon: "users" },
      { label: "Media", href: "/admin/media", icon: "images" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Settings", href: "/admin/settings", icon: "settings-2", roles: OWNER_ROLES },
      { label: "SEO", href: "/admin/seo", icon: "search", roles: OWNER_ROLES, planned: true },
      { label: "Users", href: "/admin/users", icon: "user-cog", roles: OWNER_ROLES, planned: true },
    ],
  },
];

/** The menu as one role may see it. Empty groups are dropped. */
export function navForRole(role: Role): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
  })).filter((group) => group.items.length > 0);
}
