import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type SiteSettings = Tables<"site_settings">;

/**
 * Site-wide settings: logo, contact details, theme defaults, feature toggles.
 *
 * Read on nearly every request, so it is cached indefinitely and cleared only
 * when the admin saves. `unstable_cache` with no `revalidate` means the value
 * survives until `revalidateTag(CACHE_TAGS.siteSettings)` runs — which is what
 * lets pages stay statically served while the content behind them is fully
 * database-driven.
 *
 * The client is deliberately session-free (see `createCachedClient`): a cached
 * value is shared across every visitor, so nothing user-specific may reach it.
 */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings | null> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      // A failed settings read must not blank the whole site. Callers fall
      // back to sensible defaults; the error is logged for the server console.
      console.error("[site-settings] read failed:", error.message);
      return null;
    }

    return data;
  },
  ["site-settings"],
  { tags: [CACHE_TAGS.siteSettings] },
);
