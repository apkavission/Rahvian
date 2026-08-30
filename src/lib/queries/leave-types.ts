import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The leave type master list.
 *
 * Made master data on 2026-08-30, on the owner's instruction, for the same
 * reason roles were: five words fixed in a schema meant that adding a sixth
 * needed a migration and a deploy — which in practice means it never happens,
 * and people record the new thing as "casual" until the numbers stop meaning
 * anything.
 *
 * Read through the session client rather than the service role: unlike roles,
 * nothing in this panel's own shell depends on it, so there is no reason to
 * read it with more authority than the person asking has.
 *
 * **Not cached.** Roles are read on every admin request and are cached for that
 * reason. This is read on one screen. A cache here would buy nothing and would
 * add a second thing to remember to clear.
 */

export interface LeaveTypeDefinition {
  key: string;
  label: string;
  description: string;
  is_paid: boolean;
  needs_balance: boolean;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
  /** How many staff records name this type. Read separately; see below. */
  inUse?: number;
}

export async function getLeaveTypes(): Promise<LeaveTypeDefinition[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leave_types")
    .select("key, label, description, is_paid, needs_balance, is_system, is_active, sort_order")
    .order("sort_order");

  if (error) {
    /*
      Info rather than error: until the migration has been run this is the
      expected state, and an empty list is handled by the screen. There is no
      compiled fallback here — unlike roles, an empty leave list costs nobody
      their access, and inventing five types that are not in the database would
      be exactly the second list this change exists to remove.
    */
    console.info(`[leave types] not available yet (${error.message}).`);
    return [];
  }

  return (data ?? []) as LeaveTypeDefinition[];
}
