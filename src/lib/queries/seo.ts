import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type SeoDefaults = Tables<"seo_defaults">;

/**
 * Site-wide SEO defaults: title template, fallback description, verification
 * codes, the Organization document and the global crawl switch.
 *
 * Read by `generateMetadata` on every route, so it is cached with no expiry
 * and cleared only when the admin saves.
 */
export const getSeoDefaults = unstable_cache(
  async (): Promise<SeoDefaults | null> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("seo_defaults")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[seo] defaults read failed:", error.message);
      return null;
    }

    return data;
  },
  ["seo-defaults"],
  { tags: [CACHE_TAGS.seoDefaults] },
);
