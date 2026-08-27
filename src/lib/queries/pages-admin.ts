import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json, Tables } from "@/types/database";

export type PageRow = Tables<"pages">;
export type SectionRow = Tables<"page_sections">;

export interface PageSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  is_system: boolean;
  updated_at: string;
  sectionCount: number;
}

export interface AdminSection {
  id: string;
  type: string;
  sort_order: number;
  is_active: boolean;
  background_variant: string;
  content: Json;
}

export interface AdminPage {
  page: PageRow;
  sections: AdminSection[];
}

/**
 * Every page, drafts included.
 *
 * Uncached and read through the session client, so RLS decides what is
 * visible: staff see drafts, the public reads only published rows through a
 * different query entirely.
 */
export async function getAdminPages(): Promise<PageSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select("id, slug, title, status, is_system, updated_at, page_sections(id)")
    .order("title", { ascending: true });

  if (error) {
    console.error("[pages] list failed:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const { page_sections: sections, ...page } = row as PageSummary & {
      page_sections: { id: string }[];
    };
    return { ...page, sectionCount: sections?.length ?? 0 };
  });
}

/**
 * One page and every section on it, in order.
 *
 * Ordered here rather than in the query: PostgREST cannot order an embedded
 * resource and the parent row in the same request, and a page holds a handful
 * of sections.
 */
export async function getAdminPage(id: string): Promise<AdminPage | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pages")
    .select(
      "*, page_sections(id, type, sort_order, is_active, background_variant, content)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[pages] read failed for ${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  const { page_sections: rows, ...page } = data as PageRow & {
    page_sections: AdminSection[];
  };

  return {
    page,
    sections: [...(rows ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  };
}
