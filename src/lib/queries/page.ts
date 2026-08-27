import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database";

export type Page = Tables<"pages">;
export type PageSection = Tables<"page_sections">;

export interface PageWithSections {
  page: Page;
  sections: { id: string; type: string; content: Json; background: string }[];
}

/**
 * A page and its ordered sections, in one round trip.
 *
 * RLS already restricts this to published pages and active sections, and the
 * section policy additionally requires the parent page to be published — so
 * there is no status predicate here. The database is the single place that
 * rule is expressed.
 */
export function getPage(slug: string) {
  return unstable_cache(
    async (): Promise<PageWithSections | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("pages")
        .select("*, page_sections(id, type, sort_order, content, background_variant)")
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(`[page] read failed for "${slug}":`, error.message);
        return null;
      }
      if (!data) return null;

      const { page_sections: rows, ...page } = data as Page & {
        page_sections: Pick<
          PageSection,
          "id" | "type" | "sort_order" | "content" | "background_variant"
        >[];
      };

      // Ordered here rather than in the query: PostgREST cannot order an
      // embedded resource and the parent row in the same request, and the
      // section count per page is small enough that it does not matter.
      const sections = [...(rows ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((section) => ({
          id: section.id,
          type: section.type,
          content: section.content,
          background: section.background_variant,
        }));

      return { page, sections };
    },
    ["page", slug],
    { tags: [CACHE_TAGS.pages, CACHE_TAGS.page(slug)] },
  )();
}
