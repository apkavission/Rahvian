import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Project = Tables<"projects">;

/** A `media` row as it arrives embedded on a project. */
export interface ProjectImage {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
}

/** Columns a card needs. Kept narrow so the index page stays small. */
const CARD_COLUMNS = `
  id, slug, title, type, category, client_name, summary, year, is_featured, sort_order,
  thumbnail:media!projects_thumbnail_id_fkey(public_url, alt_text, width, height)
`;

export interface ProjectCard {
  id: string;
  slug: string;
  title: string;
  type: Project["type"];
  category: string | null;
  client_name: string | null;
  summary: string;
  year: number | null;
  is_featured: boolean;
  sort_order: number;
  thumbnail: ProjectImage | null;
}

export interface ProjectDetail extends Project {
  thumbnail: ProjectImage | null;
}

/**
 * Every published project, ordered.
 *
 * RLS restricts this to published rows, so there is no status predicate here —
 * the database is the one place that rule is expressed.
 *
 * Featured work leads, then the admin's own order, then the newest. Sorting in
 * the query would need three `order` calls with a nulls rule on `year`; doing
 * it here keeps the intent readable and the row count is small.
 */
export const getProjects = unstable_cache(
  async (): Promise<ProjectCard[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase.from("projects").select(CARD_COLUMNS);

    if (error) {
      console.error("[projects] list failed:", error.message);
      return [];
    }

    return (data ?? [])
      .map((row) => ({ ...row, thumbnail: toImage(row.thumbnail) }) as ProjectCard)
      .sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          a.sort_order - b.sort_order ||
          (b.year ?? 0) - (a.year ?? 0) ||
          a.title.localeCompare(b.title),
      );
  },
  ["projects-list"],
  { tags: [CACHE_TAGS.projects] },
);

/**
 * One project, in full.
 *
 * Slug-scoped cache key and tag, so editing one item does not evict the rest.
 */
export function getProject(slug: string) {
  return unstable_cache(
    async (): Promise<ProjectDetail | null> => {
      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("projects")
        .select(
          "*, thumbnail:media!projects_thumbnail_id_fkey(public_url, alt_text, width, height)",
        )
        .eq("slug", slug)
        .maybeSingle();

      if (error) {
        console.error(`[projects] read failed for "${slug}":`, error.message);
        return null;
      }
      if (!data) return null;

      return { ...data, thumbnail: toImage(data.thumbnail) } as ProjectDetail;
    },
    ["project", slug],
    { tags: [CACHE_TAGS.projects, CACHE_TAGS.project(slug)] },
  )();
}

/**
 * Media rows referenced by id — the gallery, which stores ids in JSONB rather
 * than as foreign keys and so cannot be embedded.
 *
 * Returned as a map: the caller keeps the gallery's own order and captions,
 * and a deleted asset simply drops out instead of leaving a broken image.
 */
export function getMediaByIds(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))].sort();

  return unstable_cache(
    async (): Promise<Map<string, ProjectImage>> => {
      if (unique.length === 0) return new Map();

      const supabase = createCachedClient();

      const { data, error } = await supabase
        .from("media")
        .select("id, public_url, alt_text, width, height")
        .in("id", unique);

      if (error) {
        console.error("[projects] gallery read failed:", error.message);
        return new Map();
      }

      return new Map(
        (data ?? []).map((row) => [
          row.id,
          { url: row.public_url, alt: row.alt_text, width: row.width, height: row.height },
        ]),
      );
    },
    ["media-by-ids", unique.join(",")],
    { tags: [CACHE_TAGS.media] },
  )();
}

type EmbeddedMedia =
  | { public_url: string; alt_text: string; width: number | null; height: number | null }
  | null
  | undefined;

function toImage(row: EmbeddedMedia): ProjectImage | null {
  if (!row) return null;
  return { url: row.public_url, alt: row.alt_text, width: row.width, height: row.height };
}
