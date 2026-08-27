import "server-only";

import { notFound, redirect } from "next/navigation";
import type { MenuKey } from "@/components/admin/nav";
import { canReach } from "@/lib/auth/menu";
import { roleByKey, type RoleDefinition } from "@/lib/auth/roles";
import { getRoles } from "@/lib/queries/roles";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

export type { Role, RoleDefinition } from "@/lib/auth/roles";

export interface StaffSession {
  userId: string;
  email: string | null;
  profile: Profile;
  /**
   * The role, resolved against the master list.
   *
   * Carried on the session rather than looked up again by every caller: a
   * capability question asked twice in one request is a capability question
   * that can be answered two ways. Undefined when the account points at a role
   * that has been deleted — which `getStaffSession` refuses outright, so
   * anything holding a session has a role.
   */
  role: RoleDefinition;
}

/**
 * The signed-in staff member, or null.
 *
 * Two reads rather than one, and deliberately in this order.
 * `supabase.auth.getUser()` verifies the token against the auth server;
 * `getSession()` only decodes whatever cookie was sent, which a browser can be
 * made to send anything in. Authorisation must never be decided from an
 * unverified token.
 *
 * The profile carries the role, the active flag and the estate-wide access
 * list. A user whose profile is missing or deactivated is treated as signed
 * out — `is_active` is the one switch that revokes access everywhere at once
 * (spec §28), and it has to mean that here as well as in the RLS policies.
 *
 * Never cached. A cached session would be shared between visitors, which is
 * the one thing a session must never be.
 */
export async function getStaffSession(): Promise<StaffSession | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) return null;
  if (!profile.app_access.includes("company")) return null;

  /*
    The role is master data, and it is capable of being switched off.

    An account whose role has been deleted, deactivated, or had `is_staff`
    taken from it is treated exactly as a deactivated account is: signed out on
    the next request. Suspending a whole class of account by editing one role
    row has to mean that, or it is a label change with a reassuring name.
  */
  const role = roleByKey(await getRoles(), profile.role);
  if (!role || !role.is_active || !role.is_staff) return null;

  return { userId: user.id, email: user.email ?? null, profile, role };
}

/**
 * The session, or a redirect to the login screen.
 *
 * Every admin page calls this. The middleware already turns anonymous requests
 * away, but a middleware check is a routing convenience, not an authorisation
 * boundary: it cannot see the profile, and it is skipped for requests that
 * never pass through it. The page has to establish for itself who is asking.
 */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect("/admin/login");
  return session;
}

/**
 * The session, or a 404, for one screen.
 *
 * What every admin page calls instead of `requireStaff()`. The resolved menu
 * is the permission (spec §15.2): if a screen is not in it, typing its URL
 * answers exactly as a route that does not exist would, rather than opening a
 * form that refuses to save at the end of filling it in.
 *
 * `notFound()` rather than a "you may not" page, deliberately. A refusal
 * confirms the screen is there and that someone else can reach it, which is a
 * fact an account that may not use it has no business learning.
 *
 * This is the routing layer of three. The middleware turned anonymous requests
 * away, and RLS refuses the rows underneath whatever this decides.
 */
export async function requireMenu(key: MenuKey): Promise<StaffSession> {
  const session = await requireStaff();
  if (!canReach(session.profile, session.role, key)) notFound();
  return session;
}

/**
 * May this account see and act on enquiries?
 *
 * The resolved menu, not a role list. A role carries the screen by default and
 * any individual can be granted it, which is the point of a per-person menu —
 * and `company.can_manage_leads()` reads the same role flag and the same two
 * arrays, so a grant means the same thing at the table as it does in the
 * sidebar. Two answers to this question that could disagree is how a screen
 * ends up listing nothing and being believed.
 */
export function canManageLeads(session: StaffSession): boolean {
  return canReach(session.profile, session.role, "leads");
}

/**
 * May this account manage accounts and roles?
 *
 * One flag on the role, and the same flag `company.is_owner()` reads. Not a
 * list of role keys: the whole point of roles being master data is that a role
 * nobody had thought of yet can carry this.
 */
export function isOwner(session: StaffSession): boolean {
  return session.role.is_owner;
}
