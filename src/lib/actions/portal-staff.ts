"use server";

import { revalidatePath } from "next/cache";
import { getStaffSession } from "@/lib/auth/session";
import { createControlClient } from "@/lib/supabase/control";
import type { RecordActionState } from "@/lib/validation/records";

/**
 * Portal and tracker access, changed from the company admin.
 *
 * ---------------------------------------------------------------------------
 * **Where the authority actually lives.**
 *
 * Not here. `control.set_portal_staff` asks `control.is_owner()` itself and
 * raises if the answer is no, so this file could be deleted and the rule would
 * still hold. The check below is the same answer given earlier, for a better
 * message than a Postgres exception — it is a courtesy, not the guard, and the
 * difference matters because a courtesy that starts believing it is the guard
 * is how a screen becomes the only thing standing between somebody and a
 * permission.
 *
 * The client carries the signed-in person's own session for exactly that
 * reason. A service-role client here would make this file the guard.
 */

const OK = (message: string): RecordActionState => ({ status: "success", message });
const NO = (message: string): RecordActionState => ({ status: "error", message });

/** One list of screens, from the checkboxes of one fieldset. */
function keys(form: FormData, field: string): string[] {
  return form.getAll(field).map(String).filter(Boolean);
}

export async function savePortalStaff(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await getStaffSession();

  if (!session) return NO("Your session has expired. Sign in again.");
  if (!session.role.is_owner) {
    return NO("Only an owner can change who works in the portal.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) return NO("That request did not make sense.");

  const roleKey = String(formData.get("role_key") ?? "").trim();

  const supabase = await createControlClient();

  const { error } = await supabase.rpc("set_portal_staff", {
    p_id: id,
    p_role_key: roleKey || null,
    p_is_active: formData.get("is_active") === "on",

    /*
      Both pairs are sent every time, not only the one that changed.

      The checkboxes are the whole truth about what this person may open: a box
      that has been cleared sends nothing at all, so "unchanged" and "all of
      them removed" arrive identically unless the full set is sent. `null`
      means "leave alone" on the other side, which is right for a caller that
      knows only part of the row and wrong for a form that knows all of it.
    */
    p_menu_extra: keys(formData, "menu_extra"),
    p_menu_denied: keys(formData, "menu_denied"),
    p_tracker_menu_extra: keys(formData, "tracker_menu_extra"),
    p_tracker_menu_denied: keys(formData, "tracker_menu_denied"),

    /*
      An empty select clears the title; null would leave it alone.

      Every other argument on that function means "leave it" when null, which
      would make taking a wrong title *off* somebody impossible. The empty
      string is the deliberate act, and the form's first option sends it.
    */
    p_designation_key: String(formData.get("designation_key") ?? ""),

    /* Dates come back as "" from an untouched date input, which is not a
       date — sent as null so the row keeps whatever it had. */
    p_date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    p_joined_on: String(formData.get("joined_on") ?? "") || null,
  });

  if (error) {
    console.error("[portal-staff] save failed:", error.message);
    return NO(error.message);
  }

  revalidatePath("/admin/users");
  return OK("Their portal and tracker access has been saved.");
}

/**
 * Issuing somebody an offer letter, a salary slip, anything on the list.
 *
 * ---------------------------------------------------------------------------
 * **What this deliberately does not know.**
 *
 * It does not know that a salary slip needs a month, or that an offer letter is
 * made to a person. Those live on the kind's own row in `document_types`, and a
 * trigger on `portal.documents` refuses anything incomplete — in words written
 * to be read: *"Salary slip covers a period, so it needs a start and an end."*
 *
 * That is not indirection for its own sake. It is what makes a kind added next
 * month enforced without this file changing, and it is why the refusal below is
 * shown as the database wrote it rather than replaced with something generic.
 *
 * **Authority is `control.issue_staff_document`'s**, which asks
 * `control.is_owner()` itself. A salary slip is the most private row in this
 * estate, and the screen must not be the thing standing between somebody and
 * everybody's pay.
 */
export async function issueStaffDocument(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await getStaffSession();

  if (!session) return NO("Your session has expired. Sign in again.");
  if (!session.role.is_owner) {
    return NO("Only an owner can issue somebody's documents.");
  }

  const staffId = String(formData.get("staff_id") ?? "");
  const kindKey = String(formData.get("kind_key") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!staffId || !kindKey) return NO("That request did not make sense.");
  if (title.length < 2) return NO("Give it a title somebody will recognise later.");

  /* An empty box is "not given", not zero. `Number("")` is 0, which would file
     a salary slip for nothing and satisfy the rule that says one is required. */
  const amount = String(formData.get("amount") ?? "").trim();

  const supabase = await createControlClient();

  const { error } = await supabase.rpc("issue_staff_document", {
    p_staff_id: staffId,
    p_kind_key: kindKey,
    p_title: title,
    p_amount: amount === "" ? null : Number(amount),
    p_period_start: String(formData.get("period_start") ?? "") || null,
    p_period_end: String(formData.get("period_end") ?? "") || null,
    p_paid_on: String(formData.get("paid_on") ?? "") || null,
    p_paid_method: String(formData.get("paid_method") ?? "").trim() || null,
    p_note: String(formData.get("note") ?? "").trim() || null,
  });

  if (error) {
    /* The kind's own rule, in its own words — see the note above. */
    console.error("[portal-staff] issue failed:", error.message);
    return NO(tidy(error.message));
  }

  revalidatePath("/admin/users");
  return OK("Issued. They can see it in the tracker under Documents.");
}

/**
 * A database message, without the database.
 *
 * Postgres prefixes its own context onto a raised exception. The sentence
 * itself is written for a person to read; everything around it is not.
 */
function tidy(message: string): string {
  return (message.split("\n")[0] ?? message).replace(/^ERROR:\s*/i, "").trim();
}
