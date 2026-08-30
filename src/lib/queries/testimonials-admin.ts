import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProjectOption } from "@/lib/records/testimonials";
import type { Tables } from "@/types/database";

export type TestimonialRow = Tables<"testimonials">;

export interface TestimonialSummaryRow {
  id: string;
  author_name: string;
  company_name: string | null;
  quote: string;
  status: string;
  consent_confirmed: boolean;
  sort_order: number;
}

/**
 * Every quote, drafts and archived ones included, in the order they are shown.
 *
 * Uncached and read through the session client, so RLS decides what comes back:
 * `testimonials_staff_write` is a `for all` policy, which is what lets staff
 * select the rows `testimonials_public_read` hides. The public read is a
 * different query — cached, anonymous, published only — and the two must stay
 * separate.
 */
export async function getAdminTestimonials(): Promise<TestimonialSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("id, author_name, company_name, quote, status, consent_confirmed, sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[testimonials] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/** One quote, every column, whatever its status. */
export async function getAdminTestimonial(id: string): Promise<TestimonialRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[testimonials] admin read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}

/**
 * The portfolio entries a quote can be attached to.
 *
 * Drafts included. A quote is very often recorded while the write-up of the
 * work it praises is still being drafted, and offering only published entries
 * would mean the two could never be linked in the order they actually happen.
 */
export async function getProjectOptions(): Promise<ProjectOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, status")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[testimonials] project options failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    label: row.status === "published" ? row.title : `${row.title} · ${row.status}`,
  }));
}
