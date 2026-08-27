import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type PricingPlanRow = Tables<"pricing_plans">;

export interface PricingPlanSummaryRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  price_from: number | null;
  currency: string;
  is_custom_quote: boolean;
  is_highlighted: boolean;
  status: string;
  sort_order: number;
  updated_at: string;
}

const SUMMARY_COLUMNS =
  "id, slug, name, tagline, price_from, currency, is_custom_quote, is_highlighted, status, sort_order, updated_at";

/**
 * Every plan, drafts and archived ones included, in the order the cards appear.
 *
 * Uncached and read through the session client, so RLS decides what comes
 * back: `pricing_plans_staff_write` is a `for all` policy, which is what lets
 * staff select the rows `pricing_plans_public_read` hides. The public list in
 * `queries/pricing.ts` is a different query — cached, anonymous, published only
 * — and the two must stay separate. A cached read here would serve one editor's
 * view of an unpublished price to the next visitor, which on this table is the
 * worst possible thing to leak.
 */
export async function getAdminPricingPlans(): Promise<PricingPlanSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select(SUMMARY_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[pricing] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Every plan in full, in card order — what the preview renders.
 *
 * A separate read from the summary above rather than widening it: the list on
 * the left needs eleven columns for thirty rows, and the preview needs all of
 * them for the same rows. Making the list carry the features array and the
 * button text so the preview can share one query would be paying for the
 * preview on every screen that has not opened it.
 */
export async function getAdminPricingCards(): Promise<PricingPlanRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[pricing] admin card read failed:", error.message);
    return [];
  }

  return data ?? [];
}

/** One plan, every column, whatever its status. */
export async function getAdminPricingPlan(id: string): Promise<PricingPlanRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pricing_plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[pricing] admin read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}
