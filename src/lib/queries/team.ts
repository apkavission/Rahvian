import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createCachedClient } from "@/lib/supabase/server";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  bio: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  skills: string[];
  photo: { url: string; alt: string; width: number | null; height: number | null } | null;
}

/**
 * Published team members, in the admin's order.
 *
 * Empty is a legitimate answer, not a failure: the section that renders this
 * disappears rather than showing an empty grid, so the About page is correct
 * both before and after anyone is listed here.
 */
export const getTeamMembers = unstable_cache(
  async (): Promise<TeamMember[]> => {
    const supabase = createCachedClient();

    const { data, error } = await supabase
      .from("team_members")
      .select(
        `id, name, role, bio, linkedin_url, github_url, skills,
         photo:media!team_members_photo_id_fkey(public_url, alt_text, width, height)`,
      )
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[team] read failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => {
      const photo = row.photo as
        | { public_url: string; alt_text: string; width: number | null; height: number | null }
        | null;

      return {
        id: row.id,
        name: row.name,
        role: row.role,
        bio: row.bio,
        linkedin_url: row.linkedin_url,
        github_url: row.github_url,
        skills: row.skills ?? [],
        photo: photo
          ? { url: photo.public_url, alt: photo.alt_text, width: photo.width, height: photo.height }
          : null,
      };
    });
  },
  ["team-members"],
  { tags: [CACHE_TAGS.team] },
);
