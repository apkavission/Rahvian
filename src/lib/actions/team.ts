"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getStaffSession } from "@/lib/auth/session";
import { getMediaOptions } from "@/lib/queries/media-admin";
import { createClient } from "@/lib/supabase/server";
import { teamSchema, valuesToRow } from "@/lib/records/team";
import {
  fieldErrors,
  moveRecordSchema,
  recordIdSchema,
  saveRecordSchema,
  type RecordActionState,
} from "@/lib/validation/records";

/**
 * Team mutations.
 *
 * Every one clears `INVALIDATION_MAP.team()`, which is the team tag and the
 * About page together — the page renders the grid, so clearing only the list
 * would leave the page it appears on serving the previous version indefinitely.
 */

async function guard(): Promise<RecordActionState | null> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  return null;
}

function refresh() {
  for (const tag of INVALIDATION_MAP.team()) updateTag(tag);
  revalidatePath("/admin/team");
}

const createMemberSchema = z.object({
  name: z.string().trim().min(1, "Give the person a name.").max(120, "That name is too long."),
  role: z.string().trim().min(1, "Say what they do here.").max(120, "That role is too long."),
});

/**
 * Add someone.
 *
 * Two fields, both of which the table requires, and a draft at the end of the
 * order. A profile that appeared on the About page the moment a name was typed
 * would be a card with a name, a role and nothing else — and the person typing
 * it is one redirect away from the form that fills it in.
 */
export async function createMember(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = createMemberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("team_members")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data, error } = await supabase
    .from("team_members")
    .insert({
      name: parsed.data.name,
      role: parsed.data.role,
      status: "draft",
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      skills: [],
    })
    .select("id")
    .single();

  if (error) {
    console.error("[team] create failed:", error.message);
    return { status: "error", message: "Could not add them." };
  }

  revalidatePath("/admin/team");

  redirect(`/admin/team?member=${data.id}`);
}

export async function saveMember(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = saveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(parsed.data.values);
  } catch {
    return {
      status: "error",
      message: "The editor sent something unreadable. Reload the page and try again.",
    };
  }

  // Rebuilt from the same library the form was built from, so a photo id that
  // is not an asset is refused rather than written.
  const values = teamSchema(await getMediaOptions()).safeParse(raw);

  if (!values.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(values.error.issues),
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("team_members")
    .update(valuesToRow(values.data as Record<string, unknown>))
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[team] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "The About page is already showing it." };
}

/**
 * Move someone one place along the grid.
 *
 * The order of a team grid is read as seniority whether or not it was meant
 * that way, which is exactly why it is the owner's to arrange rather than
 * something derived from a name or a date.
 */
export async function moveMember(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = moveRecordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: members } = await supabase
    .from("team_members")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });

  if (!members) return { status: "error", message: "Could not read the list." };

  const index = members.findIndex((row) => row.id === parsed.data.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;

  if (index < 0 || target < 0 || target >= members.length) {
    return { status: "error", message: "They are already at the end." };
  }

  const a = members[index];
  const b = members[target];

  const [first, second] = await Promise.all([
    supabase.from("team_members").update({ sort_order: b.sort_order }).eq("id", a.id),
    supabase.from("team_members").update({ sort_order: a.sort_order }).eq("id", b.id),
  ]);

  if (first.error || second.error) {
    console.error("[team] move failed:", first.error?.message ?? second.error?.message);
    return { status: "error", message: "Could not move them." };
  }

  refresh();

  return { status: "success", message: "Moved." };
}

/**
 * Duplicate a profile.
 *
 * A draft at the end, without the profile links. Two cards pointing at one
 * person's LinkedIn is one card claiming to be someone it is not — and a
 * duplicate here is almost always being used as a template for a different
 * person rather than as a second copy of the same one.
 */
export async function duplicateMember(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { data: member } = await supabase
    .from("team_members")
    .select("*")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!member) return { status: "error", message: "That profile no longer exists." };

  const { data: last } = await supabase
    .from("team_members")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);

  const { data: created, error } = await supabase
    .from("team_members")
    .insert({
      name: `${member.name} (copy)`,
      role: member.role,
      bio: member.bio,
      skills: member.skills,
      photo_id: member.photo_id,
      status: "draft",
      sort_order: (last?.[0]?.sort_order ?? 0) + 1,

      // Not carried across, on purpose. See the note above.
      linkedin_url: null,
      github_url: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[team] duplicate failed:", error.message);
    return { status: "error", message: "Could not duplicate it." };
  }

  refresh();

  redirect(`/admin/team?member=${created.id}`);
}

/**
 * Remove a profile.
 *
 * The one irreversible action on this screen, which is why the button asks
 * first and the dialog offers archiving instead — that takes the card off the
 * About page just as completely, and it is what you want when someone leaves
 * and the write-up is still worth keeping.
 */
export async function deleteMember(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = recordIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("team_members").delete().eq("id", parsed.data.id);

  if (error) {
    console.error("[team] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Deleted." };
}
