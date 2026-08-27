import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type ServiceRow = Tables<"services">;

export interface ServiceSummaryRow {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  icon: string | null;
  summary: string;
  status: string;
  sort_order: number;
  is_custom_quote: boolean;
  price_from: number | null;
  updated_at: string;
}

const SUMMARY_COLUMNS =
  "id, slug, name, short_name, icon, summary, status, sort_order, is_custom_quote, price_from, updated_at";

/**
 * Every service, drafts and archived ones included.
 *
 * Uncached and read through the session client, so RLS decides what comes
 * back: `services_staff_write` is a `for all` policy, which is what lets staff
 * select the rows `services_public_read` hides. The public list is a different
 * query in `queries/services.ts` — cached, anonymous, published only — and the
 * two must stay separate. A cached read here would serve one editor's view of a
 * draft to the next visitor.
 */
export async function getAdminServices(): Promise<ServiceSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select(SUMMARY_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[services] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/** One service, every column, whatever its status. */
export async function getAdminService(id: string): Promise<ServiceRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[services] admin read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}
