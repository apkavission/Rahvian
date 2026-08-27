import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";

export interface Faq {
  id: string;
  question: string;
  answer: string;
}

/**
 * Active FAQs for one scope: "home", "pricing", "contact", or a service slug.
 *
 * Scoped rather than duplicated, so one honest answer about code ownership can
 * appear on three pages without three copies drifting apart.
 *
 * Shared between the section that renders the questions and the route that
 * emits the `FAQPage` document for them — both must read the same list, or the
 * structured data would claim questions the page does not show, which is the
 * kind of mismatch a manual review penalises.
 */
export function getFaqs(scope: string) {
  return unstable_cache(
    async (): Promise<Faq[]> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer")
        // `cs` is "contains": the row's scope array must include this page.
        .contains("scope", [scope])
        .order("sort_order", { ascending: true });

      if (error) {
        console.error(`[faq] read failed for scope "${scope}":`, error.message);
        return [];
      }

      return data ?? [];
    },
    ["faqs", scope],
    { tags: [CACHE_TAGS.faqs] },
  )();
}
