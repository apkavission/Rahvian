"use server";

import { revalidatePath } from "next/cache";
import { canManageLeads, getStaffSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  archiveSchema,
  assignSchema,
  noteSchema,
  spamSchema,
  updateStatusSchema,
  type LeadActionState,
} from "@/lib/validation/leads";

/**
 * Lead mutations.
 *
 * None of these touches a cache tag. Leads never appear on a public page, so
 * there is nothing cached to invalidate — only the admin's own route needs
 * refreshing, which is what `revalidatePath` does. Reaching for
 * `revalidateTag` here would clear public caches for no reason.
 *
 * Every action re-establishes the session and the role. A Server Action is an
 * HTTP endpoint: not being able to reach the screen does not stop anyone
 * posting to it. RLS refuses the write underneath regardless — `can_manage_leads()`
 * excludes editors at the database, which is the check that cannot be bypassed
 * by a mistake in this file.
 */

async function guard(): Promise<LeadActionState | null> {
  const session = await getStaffSession();

  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }
  if (!canManageLeads(session.profile)) {
    return { status: "error", message: "You do not have access to enquiries." };
  }
  return null;
}

/** First message from each issue, keyed by field, for inline display. */
function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function updateLeadStatus(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = updateStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That status is not one we recognise." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.lead_id);

  if (error) {
    console.error("[leads] status update failed:", error.message);
    return { status: "error", message: "Could not change the status. Nothing was saved." };
  }

  // The status change itself is recorded by a database trigger, so the audit
  // trail cannot be forgotten the way an application call can.
  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/leads");

  return { status: "success", message: "Status updated." };
}

export async function assignLead(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That is not an account we can assign to." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ assigned_to: parsed.data.assigned_to })
    .eq("id", parsed.data.lead_id);

  if (error) {
    console.error("[leads] assignment failed:", error.message);
    return { status: "error", message: "Could not assign it. Nothing was saved." };
  }

  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/leads");

  return {
    status: "success",
    message: parsed.data.assigned_to ? "Assigned." : "Assignment cleared.",
  };
}

export async function addLeadNote(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const refused = await guard();
  if (refused) return refused;

  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const parsed = noteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the note and try again.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("lead_notes").insert({
    lead_id: parsed.data.lead_id,
    body: parsed.data.body,
    author_id: session.userId,
  });

  if (error) {
    console.error("[leads] note insert failed:", error.message);
    return { status: "error", message: "Could not save the note. Nothing was written." };
  }

  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);

  return { status: "success", message: "Note added." };
}

/**
 * Archive or restore.
 *
 * A soft delete, always. Leads are the business asset — nothing an admin can
 * click removes one, and the archived view is how you get back to it.
 */
export async function archiveLead(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = archiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ archived_at: parsed.data.archived ? new Date().toISOString() : null })
    .eq("id", parsed.data.lead_id);

  if (error) {
    console.error("[leads] archive failed:", error.message);
    return { status: "error", message: "Could not do that. Nothing was changed." };
  }

  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/leads");

  return {
    status: "success",
    message: parsed.data.archived ? "Moved to the archive." : "Restored.",
  };
}

/** Mark as spam, or take the mark off. Also a flag, never a deletion. */
export async function markLeadSpam(
  _previous: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const refused = await guard();
  if (refused) return refused;

  const parsed = spamSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("leads")
    .update({ is_spam: parsed.data.is_spam })
    .eq("id", parsed.data.lead_id);

  if (error) {
    console.error("[leads] spam flag failed:", error.message);
    return { status: "error", message: "Could not do that. Nothing was changed." };
  }

  revalidatePath(`/admin/leads/${parsed.data.lead_id}`);
  revalidatePath("/admin/leads");

  return {
    status: "success",
    message: parsed.data.is_spam ? "Marked as spam." : "No longer marked as spam.",
  };
}
