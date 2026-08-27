import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient, createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Technology = Pick<
  Tables<"technologies">,
  "id" | "name" | "category" | "sort_order"
>;

const COLUMNS = "id, name, category, sort_order";

/** Every technology, ordered. Cached once and filtered by callers. */
export const getTechnologies = unstable_cache(
  async (): Promise<Technology[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("technologies")
      .select(COLUMNS)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[technologies] read failed:", error.message);
      return [];
    }

    return data ?? [];
  },
  ["technologies"],
  { tags: [CACHE_TAGS.technologies] },
);

/**
 * The subset a service names in `technology_ids`, in the site's own order.
 *
 * Filtered in memory from the cached full list rather than queried per
 * service. There are twenty-two technologies in total, so the whole set costs
 * less than the seven extra round trips prerendering the service pages would
 * otherwise make — and they all share one cache entry.
 */
export async function getTechnologiesByIds(ids: string[]): Promise<Technology[]> {
  if (ids.length === 0) return [];

  const wanted = new Set(ids);
  return (await getTechnologies()).filter((tech) => wanted.has(tech.id));
}

/**
 * Every technology, including the ones switched off.
 *
 * The admin needs the full set for two reasons the public list cannot serve.
 * `getTechnologies()` reads anonymously through the cache, so RLS hands it only
 * the active rows — and a service that already names a technology since
 * switched off would have that id silently dropped the next time someone saved
 * the service, because the checkbox it belongs to would no longer offer it.
 *
 * Uncached and through the session client, like every other admin read.
 */
export async function getAdminTechnologies(): Promise<Technology[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("technologies")
    .select(COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[technologies] admin read failed:", error.message);
    return [];
  }

  return data ?? [];
}
