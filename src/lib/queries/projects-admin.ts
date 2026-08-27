import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ProjectImage } from "@/lib/queries/projects";
import type { Enums, Tables } from "@/types/database";

export type ProjectRow = Tables<"projects">;

/** One project with its thumbnail resolved, as the preview renders it. */
export interface AdminProject extends ProjectRow {
  thumbnail: ProjectImage | null;
}

export interface ProjectSummaryRow {
  id: string;
  slug: string;
  title: string;
  type: Enums<"project_type">;
  category: string | null;
  client_name: string | null;
  summary: string;
  year: number | null;
  is_featured: boolean;
  status: string;
  sort_order: number;
  updated_at: string;
}

const SUMMARY_COLUMNS =
  "id, slug, title, type, category, client_name, summary, year, is_featured, status, sort_order, updated_at";

/**
 * Every portfolio item, drafts and archived ones included.
 *
 * Uncached and read through the session client, so RLS decides what comes
 * back: `projects_staff_write` is a `for all` policy, which is what lets staff
 * select the rows `projects_public_read` hides. The public list lives in
 * `queries/projects.ts` — cached, anonymous, published only — and the two must
 * stay separate. A cached read here would serve one editor's view of a draft to
 * the next visitor.
 */
export async function getAdminProjects(): Promise<ProjectSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select(SUMMARY_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[projects] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/**
 * One project, every column, whatever its status.
 *
 * The thumbnail is embedded rather than left as an id, so the preview shows the
 * image the live page would show instead of a gap where one will be.
 */
export async function getAdminProject(id: string): Promise<AdminProject | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("projects")
    .select("*, thumbnail:media!projects_thumbnail_id_fkey(public_url, alt_text, width, height)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[projects] admin read failed for ${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  const { thumbnail, ...project } = data as ProjectRow & {
    thumbnail:
      | { public_url: string; alt_text: string; width: number | null; height: number | null }
      | null;
  };

  return {
    ...project,
    thumbnail: thumbnail
      ? {
          url: thumbnail.public_url,
          alt: thumbnail.alt_text,
          width: thumbnail.width,
          height: thumbnail.height,
        }
      : null,
  };
}
