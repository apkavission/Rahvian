import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type PricingPlan = Tables<"pricing_plans">;

/**
 * Published pricing plans, in the admin's order.
 *
 * RLS restricts this to published rows, so there is no status predicate here.
 * A published plan is guaranteed by a check constraint to carry either a
 * starting price or the custom-quote flag, which is what lets the card render
 * a price line unconditionally without ever printing a blank.
 */
export const getPricingPlans = unstable_cache(
  async (): Promise<PricingPlan[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("pricing_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[pricing] list failed:", error.message);
      return [];
    }

    return data ?? [];
  },
  ["pricing-plans"],
  { tags: [CACHE_TAGS.pricing] },
);
