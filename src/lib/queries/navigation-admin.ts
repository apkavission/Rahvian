import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NavItemRow } from "@/lib/records/navigation";

/**
 * Every navigation link, hidden ones included, in the stored order.
 *
 * The whole table rather than one menu at a time. It is about twenty-five rows
 * and the screen needs all of them anyway: the menu pills carry counts, and
 * the parent select has to know what else is top level. Five queries for a set
 * that fits in one response would be five round trips to save nothing.
 *
 * Uncached and read through the session client, so RLS decides what comes
 * back: `nav_items_staff_write` is a `for all` policy, which is what lets
 * staff select the rows `nav_items_public_read` hides behind `is_active`. The
 * public read in `queries/navigation.ts` is a different query — cached,
 * anonymous, one location at a time, shaped into a tree — and the two must
 * stay separate.
 */
export async function getAdminNavItems(): Promise<NavItemRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("nav_items")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[navigation] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}
