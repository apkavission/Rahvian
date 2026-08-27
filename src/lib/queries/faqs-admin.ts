import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PAGE_SCOPES } from "@/lib/records/faqs";
import type { Tables } from "@/types/database";

export type FaqRow = Tables<"faqs">;

/**
 * Every FAQ, hidden ones included, in the stored order.
 *
 * Uncached and read through the session client, so RLS decides what comes
 * back: `faqs_staff_write` is a `for all` policy, which is what lets staff
 * select the rows `faqs_public_read` hides behind `is_active`. The public read
 * in `queries/faqs.ts` is a different query — cached, anonymous, one scope at a
 * time — and the two must stay separate.
 */
export async function getAdminFaqs(): Promise<FaqRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[faqs] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/** One FAQ, whether or not it is shown. */
export async function getAdminFaq(id: string): Promise<FaqRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.from("faqs").select("*").eq("id", id).maybeSingle();

  if (error) {
    console.error(`[faqs] admin read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}

/**
 * Every page an FAQ may be attached to.
 *
 * Three sources, unioned, and each is there for a reason:
 *
 *   **The fixed pages** — home, pricing, contact — are the scopes the seeded
 *   questions use and the ones the page builder's FAQ section is normally set
 *   to.
 *
 *   **Every service slug**, because `faqs.scope` accepts one and a service
 *   page renders the questions scoped to it. Drafts are included: a service
 *   and its questions get written in the same sitting.
 *
 *   **Anything already stored**, so a scope this list has since stopped
 *   offering — a renamed service, a page that was retired — still appears as a
 *   tickable box. Without it, opening such a row and saving would silently drop
 *   that scope, because the schema refuses a value the checkboxes do not offer.
 *
 * Read here rather than exported from the actions file: every export from a
 * `"use server"` module becomes a callable endpoint, and a list of options is a
 * read, not an action.
 */
export async function faqScopeOptions(): Promise<{ value: string; label: string }[]> {
  const supabase = await createClient();

  const [services, faqs] = await Promise.all([
    supabase.from("services").select("slug, name, status").order("sort_order"),
    supabase.from("faqs").select("scope"),
  ]);

  const options = new Map<string, string>();

  for (const page of PAGE_SCOPES) options.set(page.value, page.label);

  for (const service of services.data ?? []) {
    options.set(
      service.slug,
      service.status === "published" ? service.name : `${service.name} (${service.status})`,
    );
  }

  for (const row of faqs.data ?? []) {
    for (const scope of row.scope ?? []) {
      if (!options.has(scope)) options.set(scope, `${scope} (no longer a page)`);
    }
  }

  return [...options].map(([value, label]) => ({ value, label }));
}
