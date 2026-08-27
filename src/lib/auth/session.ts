import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;
export type Role = Profile["role"];

export interface StaffSession {
  userId: string;
  email: string | null;
  profile: Profile;
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

  return { userId: user.id, email: user.email ?? null, profile };
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

/** Roles that may read and act on leads. Mirrors `company.can_manage_leads()`. */
const LEAD_ROLES: Role[] = ["super_admin", "owner", "admin"];

/** Roles that may manage users and change global settings. Mirrors `company.is_owner()`. */
const OWNER_ROLES: Role[] = ["super_admin", "owner"];

export function canManageLeads(profile: Profile): boolean {
  return LEAD_ROLES.includes(profile.role);
}

export function isOwner(profile: Profile): boolean {
  return OWNER_ROLES.includes(profile.role);
}

/**
 * What a role is called on screen.
 *
 * Every value in the enum is listed, including the ones that never reach this
 * application: the enum is shared with the client portal and the demo estate,
 * and a label map with a hole in it fails at exactly the moment someone
 * creates that account.
 */
export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  client: "Client",
  developer: "Developer",
  demo_viewer: "Demo viewer",
};
