import type { MenuKey } from "@/components/admin/nav";

/**
 * A role.
 *
 * Master data since 2026-08-27, on the owner's instruction: roles come from
 * `company.roles`, which the admin panel edits, rather than from a list
 * compiled into the application. What a role *is* — a label, an authority
 * rank, three capabilities and a default menu — is fixed by this type; which
 * roles exist, what they are called and what they can reach is not.
 *
 * Not server-only. The users screen builds its role select and its menu
 * checkboxes from these same definitions in the browser, and a second
 * implementation of "what does this role mean" is precisely the drift this
 * file exists to prevent.
 */
export interface RoleDefinition {
  /** Stable identifier. Stored in `profiles.role`. Never shown to anyone. */
  key: string;
  /** What it is called on screen. Editable, and expected to be edited. */
  label: string;
  description: string;
  /**
   * Authority. Nobody may create or edit an account into a role ranked above
   * their own, which is what stops an owner minting a super admin.
   */
  rank: number;
  /** May reach the company admin panel at all. Mirrors `company.is_staff()`. */
  is_staff: boolean;
  /** May read and act on enquiries. Mirrors `company.can_manage_leads()`. */
  can_manage_leads: boolean;
  /** May manage accounts and roles. Mirrors `company.is_owner()`. */
  is_owner: boolean;
  /** Screens this role reaches before anything is said about the individual. */
  default_menu: string[];
  /** Built in. The key cannot change and the row cannot be deleted. */
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
}

/** A role key. `string`, because the set is data and not a closed union. */
export type Role = string;

const CONTENT_MENU: MenuKey[] = [
  "pages",
  "navigation",
  "services",
  "portfolio",
  "case-studies",
  "blog",
  "pricing",
  "faqs",
  "team",
  "media",
];

const OWNER_MENU: MenuKey[] = [
  "dashboard",
  "leads",
  ...CONTENT_MENU,
  "settings",
  "seo",
  "users",
];

/**
 * The roles compiled into the application.
 *
 * The standing rule in two parts, and both halves matter. Every dynamic thing
 * has a compiled fallback, so a database that cannot be read degrades to a
 * working panel rather than to an empty sidebar or a crash. And the fallback
 * is not the source of truth: these seven are what the migration seeds, they
 * are expected to be edited afterwards, and nothing reads this list when the
 * table can be read.
 *
 * Kept identical to the seed in `20260827000013_roles_master.sql`. If they
 * disagree, the database wins — which is the right way round, and the reason
 * this list is only ever a floor.
 */
export const FALLBACK_ROLES: RoleDefinition[] = [
  {
    key: "super_admin",
    label: "Super admin",
    description:
      "Everything an owner can do, across the whole estate. Kept for the person who maintains the software.",
    rank: 30,
    is_staff: true,
    can_manage_leads: true,
    is_owner: true,
    default_menu: OWNER_MENU,
    is_system: true,
    is_active: true,
    sort_order: 10,
  },
  {
    key: "owner",
    label: "Owner",
    description: "The business. Every screen, including accounts and site settings.",
    rank: 20,
    is_staff: true,
    can_manage_leads: true,
    is_owner: true,
    default_menu: OWNER_MENU,
    is_system: true,
    is_active: true,
    sort_order: 20,
  },
  {
    key: "admin",
    label: "Admin",
    description: "Content and enquiries. Cannot reach accounts or site settings.",
    rank: 10,
    is_staff: true,
    can_manage_leads: true,
    is_owner: false,
    default_menu: ["dashboard", "leads", ...CONTENT_MENU],
    is_system: true,
    is_active: true,
    sort_order: 30,
  },
  {
    key: "editor",
    label: "Editor",
    description:
      "Content only. Never sees enquiries — access to content must not imply access to commercial data.",
    rank: 0,
    is_staff: true,
    can_manage_leads: false,
    is_owner: false,
    default_menu: ["dashboard", ...CONTENT_MENU],
    is_system: true,
    is_active: true,
    sort_order: 40,
  },
  {
    key: "client",
    label: "Client",
    description: "A customer, in the client portal. Reaches nothing in this admin.",
    rank: 0,
    is_staff: false,
    can_manage_leads: false,
    is_owner: false,
    default_menu: [],
    is_system: true,
    is_active: true,
    sort_order: 50,
  },
  {
    key: "developer",
    label: "Developer",
    description: "An employee in the task tracker. Reaches nothing in this admin.",
    rank: 0,
    is_staff: false,
    can_manage_leads: false,
    is_owner: false,
    default_menu: [],
    is_system: true,
    is_active: true,
    sort_order: 60,
  },
  {
    key: "demo_viewer",
    label: "Demo viewer",
    description:
      "A visitor signed in to a demo application. Reaches nothing in this admin.",
    rank: 0,
    is_staff: false,
    can_manage_leads: false,
    is_owner: false,
    default_menu: [],
    is_system: true,
    is_active: true,
    sort_order: 70,
  },
];

/**
 * One role from a list, by key.
 *
 * Returns undefined rather than a default when the key is unknown, and every
 * caller treats that as "no capabilities". A role that has been deleted out
 * from under an account must not silently become the most convenient role to
 * hand: it becomes nothing, and the account reaches nothing, until somebody
 * gives it a role that exists.
 */
export function roleByKey(
  roles: RoleDefinition[],
  key: string | null | undefined,
): RoleDefinition | undefined {
  if (!key) return undefined;
  return roles.find((role) => role.key === key);
}

/** What a role is called, for a key that may no longer exist. */
export function roleLabel(roles: RoleDefinition[], key: string): string {
  return roleByKey(roles, key)?.label ?? key;
}

/**
 * The roles one person may hand out.
 *
 * At or below their own rank, and never an inactive one. An owner cannot mint
 * a super admin, and nobody can promote themselves by editing the account they
 * are signed in as — a rank comparison is the whole of that rule, and it lives
 * here so the select and the Server Action cannot disagree about it.
 */
export function assignableRoles(
  roles: RoleDefinition[],
  actor: RoleDefinition | undefined,
): RoleDefinition[] {
  const ceiling = actor?.rank ?? -1;
  return roles.filter((role) => role.is_active && role.rank <= ceiling);
}
