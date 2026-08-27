import "server-only";

import { getRoles } from "@/lib/queries/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/roles";

/**
 * The accounts screen's reads.
 *
 * Two sources, and they cannot be joined in a query. The profile — role,
 * active flag, applications, menu — is a row in `company.profiles`. The email
 * address is in `auth.users`, which is not in this schema and is not exposed
 * to PostgREST: the only way to read it is the Auth admin API, with the
 * service-role key.
 *
 * So: profiles through the signed-in client, so `profiles_owner_all` decides
 * what may be read, and addresses through the admin API afterwards. The screen
 * is already behind `requireMenu("users")`; this keeps the row-level answer
 * coming from the database rather than from the route having checked.
 *
 * Never cached. An account list that is served from a cache is a list that can
 * show someone as active for the rest of the cache's life after they were
 * blocked, and blocking is the one thing on this screen that has to be true the
 * instant it is done.
 */

export interface Account {
  id: string;
  full_name: string;
  email: string | null;
  role: Role;
  is_active: boolean;
  app_access: string[];
  menu_extra: string[];
  menu_denied: string[];
  last_login_at: string | null;
  created_at: string;
}

/** Owners first, then admins, then editors; alphabetical inside each. */
const ROLE_ORDER: Record<string, number> = {
  super_admin: 0,
  owner: 1,
  admin: 2,
  editor: 3,
};

/**
 * Every address the auth server holds, keyed by user id.
 *
 * Paged at 200. A company with more than two hundred staff accounts has
 * outgrown a single-column list far more urgently than it has outgrown this
 * read, and a silent second page would be worse than an obvious limit — so the
 * caller is told how many were seen and the screen says so.
 */
async function readAddresses(): Promise<{ emails: Map<string, string>; capped: boolean }> {
  const supabase = createAdminClient();
  const perPage = 200;

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage });

  if (error) {
    // Not fatal. The list still renders with the names and roles it has, and
    // an address shown as "—" is a smaller failure than a screen that will not
    // load at all when the auth API is briefly unavailable.
    console.error("[users] could not read addresses:", error.message);
    return { emails: new Map(), capped: false };
  }

  const emails = new Map<string, string>();
  for (const user of data.users) {
    if (user.email) emails.set(user.id, user.email);
  }

  return { emails, capped: data.users.length >= perPage };
}

export async function getAccounts(): Promise<{ accounts: Account[]; capped: boolean }> {
  const supabase = await createClient();

  const [{ data, error }, addresses] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, role, is_active, app_access, menu_extra, menu_denied, last_login_at, created_at",
      ),
    readAddresses(),
  ]);

  if (error) {
    console.error("[users] could not read profiles:", error.message);
    throw new Error("Could not load the accounts.");
  }

  const accounts: Account[] = (data ?? []).map((row) => ({
    id: row.id,
    full_name: row.full_name,
    email: addresses.emails.get(row.id) ?? null,
    role: row.role,
    is_active: row.is_active,
    app_access: row.app_access ?? [],
    // Both are absent until the migration that adds them has been run, and an
    // account list that throws on a column is a panel nobody can get into to
    // find out why.
    menu_extra: row.menu_extra ?? [],
    menu_denied: row.menu_denied ?? [],
    last_login_at: row.last_login_at,
    created_at: row.created_at,
  }));

  accounts.sort((a, b) => {
    const byRole = (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    if (byRole !== 0) return byRole;
    return (a.full_name || a.email || "").localeCompare(b.full_name || b.email || "");
  });

  return { accounts, capped: addresses.capped };
}

/**
 * The active accounts that can manage accounts, other than one being changed.
 *
 * Read before anything that could remove the last one — blocking an account,
 * demoting it, or moving it to a role that does not carry `is_owner`. The last
 * way in is never closed by a form; the alternative is a database nobody can
 * administer and no screen to fix it from.
 *
 * Counted from the role master list rather than from a list of role keys,
 * because which roles carry ownership is now something an owner decides.
 *
 * Returns -1 when the count could not be established. Zero would read as
 * "there are none left", which is the one answer that must never be guessed —
 * the callers refuse the change instead.
 */
export async function countOtherOwners(exceptId: string): Promise<number> {
  const supabase = createAdminClient();

  const roles = await getRoles();
  const ownerKeys = roles.filter((role) => role.is_active && role.is_owner).map((role) => role.key);

  if (ownerKeys.length === 0) return 0;

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ownerKeys)
    .eq("is_active", true)
    .neq("id", exceptId);

  if (error) {
    console.error("[users] could not count owners:", error.message);
    return -1;
  }

  return count ?? 0;
}
