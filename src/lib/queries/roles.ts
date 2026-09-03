import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { FALLBACK_ROLES, type RoleDefinition } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The role master list.
 *
 * Read on every admin request — the shell resolves the signed-in person's menu
 * from it — so it is cached under its own tag and cleared by the one screen
 * that writes it. Without the cache this would be a second round trip in front
 * of every page in the panel.
 *
 * Read with the service role rather than the session client. The list is not
 * sensitive (it is the shape of the panel, not a key to it) and a cached read
 * is shared between requests, so binding it to whichever session happened to
 * populate the cache would be wrong even where it worked.
 *
 * Falls back to the roles compiled into the application whenever the table
 * cannot be read or is empty. The standing rule, and it matters more here than
 * anywhere else: a failed read must degrade to a working admin panel, not to
 * an owner with an empty sidebar and no screen to fix it from.
 */
export const getRoles = unstable_cache(
  async (): Promise<RoleDefinition[]> => {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("roles")
      .select(
        "key, label, description, rank, is_staff, can_manage_leads, is_owner, default_menu, portal_menu, is_system, is_active, sort_order",
      )
      .order("sort_order", { ascending: true });

    if (error) {
      // Info, not error. Until the roles migration is run this is the expected
      // state, and the panel works correctly from the compiled list.
      console.info(
        `[roles] master list unavailable (${error.message}); using the built-in roles.`,
      );
      return FALLBACK_ROLES;
    }

    if (!data || data.length === 0) return FALLBACK_ROLES;

    return data.map((row) => ({
      key: row.key,
      label: row.label,
      description: row.description,
      rank: row.rank,
      is_staff: row.is_staff,
      can_manage_leads: row.can_manage_leads,
      is_owner: row.is_owner,
      default_menu: row.default_menu ?? [],
      portal_menu: row.portal_menu ?? [],
      is_system: row.is_system,
      is_active: row.is_active,
      sort_order: row.sort_order,
    }));
  },
  ["roles"],
  { tags: [CACHE_TAGS.roles] },
);
