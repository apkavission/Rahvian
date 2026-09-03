import "server-only";

import { createControlClient } from "@/lib/supabase/control";
import type {
  DesignationRow,
  PortalStaffRow,
  StaffDocumentKind,
  StaffDocumentRow,
} from "@/types/control";

/**
 * Who is on the portal and tracker staff list.
 *
 * ---------------------------------------------------------------------------
 * **Why this application asks about another one's people.**
 *
 * The portal keeps its own list, in `portal.staff`, and the tracker decides who
 * may sign in by looking for a row in it. The company website keeps a separate
 * list in `company.profiles`. The comment on the portal's table has said so
 * since the day it was written:
 *
 *   > a person who joins or leaves must be added or removed in both.
 *
 * Two lists kept in step by remembering to, which is a rule that holds until
 * somebody is busy. It does not fail loudly either: forgetting the second half
 * leaves a person able to open the tracker after they have gone, and nothing
 * anywhere says so.
 *
 * ---------------------------------------------------------------------------
 * **Through `control`, and never with the service role.**
 *
 * `control.portal_staff()` carries the caller's own session and returns nothing
 * at all to anybody who is not an estate owner — the gate is `where
 * control.is_owner()` inside the function, so it is the database refusing
 * rather than this screen choosing not to ask. Reaching `portal` from here any
 * other way would need either the service role or a policy over there naming
 * this application, and both are the coupling that schema was built without.
 */
export async function getPortalStaff(): Promise<PortalStaffRow[]> {
  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("portal_staff");

  if (error) {
    // Not thrown. This sits under an account on the Users screen, and a panel
    // that cannot answer should say so in its own corner rather than take the
    // whole screen down with it.
    console.error("[portal-staff] list failed:", error.message);
    return [];
  }

  return (data ?? []) as PortalStaffRow[];
}

/** The one row belonging to a company account, or null if they have no access. */
export async function getPortalStaffFor(
  authUserId: string,
): Promise<PortalStaffRow | null> {
  const everyone = await getPortalStaff();
  return everyone.find((person) => person.auth_user_id === authUserId) ?? null;
}

/**
 * The titles that can be given.
 *
 * ---------------------------------------------------------------------------
 * Read through `control` with the caller's own session, like the staff list
 * beside it — so it returns nothing at all to anybody who is not an estate
 * owner, and the gate is the database refusing rather than this screen
 * choosing not to ask.
 */
export async function getDesignations(): Promise<DesignationRow[]> {
  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("designations");

  if (error) {
    /* Not thrown. This sits beside the staff list on one screen, and a panel
       that cannot answer should say so in its own corner rather than take the
       whole screen down. */
    console.error("[portal-staff] designations failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * The kinds of document that can be issued to a person.
 *
 * Read from the portal's own master list rather than named here — adding an
 * experience letter is a row, not a deploy — and filtered to the kinds that
 * belong to a person: an invoice belongs to a company and is issued from the
 * portal, against a project.
 */
export async function getStaffDocumentKinds(): Promise<StaffDocumentKind[]> {
  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("staff_document_kinds");

  if (error) {
    console.error("[portal-staff] document kinds failed:", error.message);
    return [];
  }

  return data ?? [];
}

/** What has already been issued to one person. Newest first. */
export async function getStaffDocuments(staffId: string): Promise<StaffDocumentRow[]> {
  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("staff_documents", {
    p_staff_id: staffId,
  });

  if (error) {
    console.error("[portal-staff] documents failed:", error.message);
    return [];
  }

  return data ?? [];
}
