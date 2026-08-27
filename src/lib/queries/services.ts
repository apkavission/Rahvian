import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Service = Tables<"services">;

/** Columns needed for cards and navigation. Kept narrow so list pages stay small. */
const SUMMARY_COLUMNS =
  "id, slug, name, short_name, icon, summary, price_from, price_note, is_custom_quote, sort_order";

export type ServiceSummary = Pick<
  Service,
  | "id"
  | "slug"
  | "name"
  | "short_name"
  | "icon"
  | "summary"
  | "price_from"
  | "price_note"
  | "is_custom_quote"
  | "sort_order"
>;

/** All published services, ordered. Used by the nav, the index and the home grid. */
export const getServices = unstable_cache(
  async (): Promise<ServiceSummary[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("services")
      .select(SUMMARY_COLUMNS)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[services] list failed:", error.message);
      return [];
    }

    return data ?? [];
  },
  ["services-list"],
  { tags: [CACHE_TAGS.services] },
);

/**
 * One service, in full.
 *
 * The cache key includes the slug and the tag is slug-scoped, so editing one
 * service does not evict the other six.
 */
export function getService(slug: string) {
  return unstable_cache(
    async (): Promise<Service | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(`[services] read failed for "${slug}":`, error.message);
        return null;
      }

      return data;
    },
    ["service", slug],
    { tags: [CACHE_TAGS.services, CACHE_TAGS.service(slug)] },
  )();
}
