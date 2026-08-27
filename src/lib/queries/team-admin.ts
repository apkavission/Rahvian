import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/queries/team";
import type { Tables } from "@/types/database";

export type TeamMemberRow = Tables<"team_members">;

export interface TeamMemberSummaryRow {
  id: string;
  name: string;
  role: string;
  status: string;
  sort_order: number;
  updated_at: string;
}

/**
 * Everyone, drafts and archived ones included, in the order they are shown.
 *
 * Uncached and read through the session client, so RLS decides what comes
 * back: `team_members_staff_write` is a `for all` policy, which is what lets
 * staff select the rows `team_members_public_read` hides. The public list in
 * `queries/team.ts` is a different query — cached, anonymous, published only —
 * and the two must stay separate.
 */
export async function getAdminTeamMembers(): Promise<TeamMemberSummaryRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("id, name, role, status, sort_order, updated_at")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[team] admin list failed:", error.message);
    return [];
  }

  return data ?? [];
}

/** One person, every column, whatever their status. */
export async function getAdminTeamMember(id: string): Promise<TeamMemberRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[team] admin read failed for ${id}:`, error.message);
    return null;
  }

  return data;
}

/** A card as the preview renders it, plus the status the preview marks it with. */
export interface AdminTeamCard extends TeamMember {
  status: string;
}

/**
 * Everyone in card shape, drafts included — what the preview renders.
 *
 * Deliberately the same shape `getTeamMembers()` returns, photo embed and all,
 * because the preview passes it to the same `MemberCard` the About page uses.
 * The moment these two shapes diverge, the preview stops being the page.
 */
export async function getAdminTeamCards(): Promise<AdminTeamCard[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_members")
    .select(
      `id, name, role, bio, linkedin_url, github_url, skills, status,
       photo:media!team_members_photo_id_fkey(public_url, alt_text, width, height)`,
    )
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[team] admin card read failed:", error.message);
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
      status: row.status,
      photo: photo
        ? { url: photo.public_url, alt: photo.alt_text, width: photo.width, height: photo.height }
        : null,
    };
  });
}
