import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/types/database";

type NavRow = Tables<"nav_items">;
export type NavLocation = Enums<"nav_location">;

export interface NavNode {
  id: string;
  label: string;
  href: string;
  isExternal: boolean;
  openNewTab: boolean;
  icon: string | null;
  badge: string | null;
  children: NavNode[];
}

/**
 * Build a two-level tree from the flat row set.
 *
 * Done here rather than with a recursive query because the menu is small and
 * cached indefinitely — a second round trip to the database would cost more
 * than the grouping does. Depth is capped at two by a database trigger, so
 * this cannot silently truncate a deeper structure that someone expected to
 * render.
 */
function toTree(rows: NavRow[]): NavNode[] {
  const node = (row: NavRow): NavNode => ({
    id: row.id,
    label: row.label,
    href: row.href,
    isExternal: row.is_external,
    openNewTab: row.open_new_tab,
    icon: row.icon,
    badge: row.badge_text,
    children: [],
  });

  const byId = new Map<string, NavNode>();
  const roots: NavNode[] = [];

  // Rows arrive ordered by sort_order, so parents are inserted before the
  // children that reference them and a single pass is enough.
  for (const row of rows) {
    byId.set(row.id, node(row));
  }

  for (const row of rows) {
    const current = byId.get(row.id)!;
    if (row.parent_id) {
      byId.get(row.parent_id)?.children.push(current);
    } else {
      roots.push(current);
    }
  }

  return roots;
}

/**
 * Navigation for one location, as a tree.
 *
 * RLS already filters to active items, so no `is_active` predicate is needed
 * here — the policy is the single source of truth for that rule.
 */
export const getNavigation = unstable_cache(
  async (location: NavLocation): Promise<NavNode[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("nav_items")
      .select("*")
      .eq("location", location)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error(`[navigation] read failed for "${location}":`, error.message);
      return [];
    }

    return toTree(data ?? []);
  },
  ["navigation"],
  { tags: [CACHE_TAGS.navigation] },
);
