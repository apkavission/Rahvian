import {
  ADMIN_NAV,
  ADMIN_NAV_ITEMS,
  navItem,
  type AdminNavGroup,
  type AdminNavItem,
  type MenuKey,
} from "@/components/admin/nav";
import type { RoleDefinition } from "@/lib/auth/roles";

/**
 * What one person may reach, resolved.
 *
 * Not server-only, and it must not become so: the users screen builds its
 * grant checkboxes from these same functions in the browser, and a second
 * implementation of "what does this person see" is the bug this file exists to
 * prevent.
 *
 * The model, from the standing rule: **a menu is a permission, and it is per
 * person.** A role carries a default menu — master data, edited in the admin.
 * An individual may then be given extras beyond that default, or have items
 * taken away from it. Whatever their menu resolves to is exactly what they may
 * reach; typing the URL of anything else answers as if the route does not
 * exist.
 *
 * Hiding a link is never the mechanism. `requireMenu()` checks this on the
 * server for every screen, and RLS refuses the rows underneath regardless of
 * both. Three layers, and the sidebar is the weakest of them by design.
 */

/** The person as this file needs them. Anything with these fields does. */
export interface MenuSubject {
  /** Absent while the migration that adds the columns has not been run. */
  menu_extra?: string[] | null;
  menu_denied?: string[] | null;
}

/**
 * The screens a role reaches before anything is said about the person.
 *
 * `undefined` — an account whose role has been deleted or deactivated —
 * reaches nothing. Not "the least privileged role": nothing. A missing role is
 * a state somebody has to fix, and quietly substituting a working one is how
 * it never gets fixed.
 *
 * Keys the menu no longer declares are dropped here rather than carried
 * around: a default naming a screen that does not exist is not a default.
 */
export function defaultMenuFor(role: RoleDefinition | undefined): MenuKey[] {
  if (!role || !role.is_active) return [];

  return role.default_menu
    .map((key) => navItem(key))
    .filter((item): item is AdminNavItem => item !== undefined)
    .filter((item) => !item.ownerOnly || role.is_owner)
    .map((item) => item.key);
}

/**
 * Can this screen be handed to one named person?
 *
 * Two things are refused. `users` is refused always — it is what `is_owner`
 * means, not an extra to be given out, and the table would refuse every action
 * on it anyway. A screen that is not built yet is refused because granting it
 * would be granting a 404.
 */
export function isGrantable(item: AdminNavItem): boolean {
  return !item.ownerOnly && !item.planned;
}

/** Every screen an owner may hand out or take away, in menu order. */
export const GRANTABLE_ITEMS: AdminNavItem[] = ADMIN_NAV_ITEMS.filter(isGrantable);

/**
 * The screens this person may reach.
 *
 * Order of application matters and is deliberate: the role default first, then
 * the extras, then the removals. **Taken away wins**, so a mistake that grants
 * and revokes the same screen fails closed. The database refuses to hold both
 * at once (`profiles_menu_disjoint`), so this is the second answer to a
 * question that should never be asked — which is the right number of answers
 * for a permission.
 */
export function resolveMenu(
  person: MenuSubject,
  role: RoleDefinition | undefined,
): Set<MenuKey> {
  const menu = new Set<MenuKey>(defaultMenuFor(role));

  // An account with no usable role reaches nothing, and no grant on it changes
  // that. Granting a screen to a role that has been deleted would be the one
  // way to get access without a role, which is the opposite of the point.
  if (!role || !role.is_active) return menu;

  for (const key of person.menu_extra ?? []) {
    const item = navItem(key);
    // `ownerOnly` is enforced here as well as in the form that writes it: a
    // row edited straight into the database is still a row this code reads.
    if (item && isGrantable(item)) menu.add(item.key);
  }

  for (const key of person.menu_denied ?? []) {
    const item = navItem(key);
    if (item) menu.delete(item.key);
  }

  return menu;
}

/** Whether one screen is reachable. The question every admin page asks. */
export function canReach(
  person: MenuSubject,
  role: RoleDefinition | undefined,
  key: MenuKey,
): boolean {
  return resolveMenu(person, role).has(key);
}

/**
 * The menu as this person sees it. Empty groups are dropped.
 *
 * Planned screens survive when the role's default menu names them, because
 * they are rendered as disabled rows: the point of listing them is to show
 * what the panel is going to be.
 */
export function navForProfile(
  person: MenuSubject,
  role: RoleDefinition | undefined,
): AdminNavGroup[] {
  const menu = resolveMenu(person, role);

  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => menu.has(item.key)),
  })).filter((group) => group.items.length > 0);
}

/**
 * A resolved menu expressed as the two stored arrays.
 *
 * The users screen shows one checkbox per screen and lets an owner tick it or
 * clear it; what has to be stored is how that differs from the role default.
 * Doing the subtraction here rather than in the form is what lets a role change
 * and a menu change be saved together: the difference is recomputed against
 * the role being saved, not the one on screen when the page loaded.
 *
 * Only grantable screens can appear in either array, and the two never overlap,
 * which is what the check constraint on the table is there to guarantee.
 */
export function menuOverrides(
  role: RoleDefinition | undefined,
  wanted: string[],
): { menu_extra: string[]; menu_denied: string[] } {
  const chosen = new Set(wanted);
  const byDefault = new Set(defaultMenuFor(role));

  const extra: string[] = [];
  const denied: string[] = [];

  for (const item of GRANTABLE_ITEMS) {
    const has = chosen.has(item.key);
    const had = byDefault.has(item.key);

    if (has && !had) extra.push(item.key);
    if (!has && had) denied.push(item.key);
  }

  return { menu_extra: extra, menu_denied: denied };
}
