"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getStaffSession } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { fieldErrors, type RecordActionState } from "@/lib/validation/records";

/**
 * Leave type mutations.
 *
 * The list the whole estate's leave runs on. Three rules shape this file, and
 * all three are also enforced in the database — these exist so the answer
 * arrives as a sentence beside the form rather than as a constraint violation:
 *
 *   **A key is permanent.** It is written into every leave request ever
 *   recorded against it. Renaming a key would silently move that history to a
 *   type that does not exist; the label is the part meant to be changed.
 *
 *   **A built-in type is never deleted.** It can be switched off, which stops
 *   it being offered while leaving the past intact.
 *
 *   **Switching off is not deleting.** Requests already recorded keep their
 *   type, and the tracker resolves labels by key with a fallback, so history
 *   stays readable.
 */

const key = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "A key is needed.")
  .max(40)
  .regex(
    /^[a-z][a-z0-9_]*$/,
    "Lower case letters, numbers and underscores, starting with a letter.",
  );

const shape = {
  label: z.string().trim().min(2, "What is it called?").max(60),
  description: z.string().trim().max(300).optional(),
  is_paid: z.boolean(),
  needs_balance: z.boolean(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
};

const createSchema = z.object({ key, ...shape });
const saveSchema = z.object({ key: z.string().trim().min(1), ...shape });

function read(formData: FormData) {
  return {
    key: formData.get("key"),
    label: formData.get("label"),
    description: formData.get("description") || undefined,
    is_paid: formData.get("is_paid") === "on",
    needs_balance: formData.get("needs_balance") === "on",
    is_active: formData.get("is_active") === "on",
    sort_order: formData.get("sort_order") || 0,
  };
}

/** Only an owner. The same test every other master list in this panel uses. */
async function refuseUnlessOwner(): Promise<RecordActionState | null> {
  const session = await getStaffSession();

  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!session.role.is_owner) {
    return { status: "error", message: "Only an owner can change leave types." };
  }

  return null;
}

function refresh() {
  revalidatePath("/admin/users");
}

export async function createLeaveType(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refusal = await refuseUnlessOwner();
  if (refusal) return refusal;

  const parsed = createSchema.safeParse(read(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("leave_types").insert({
    key: parsed.data.key,
    label: parsed.data.label,
    description: parsed.data.description ?? "",
    is_paid: parsed.data.is_paid,
    needs_balance: parsed.data.needs_balance,
    is_active: parsed.data.is_active,
    sort_order: parsed.data.sort_order,
    is_system: false,
  });

  if (error) {
    console.error("[leave types] create failed:", error.message);

    return {
      status: "error",
      message:
        error.code === "23505"
          ? "There is already a type with that key."
          : "Could not add it. Nothing was changed.",
      fieldErrors: error.code === "23505" ? { key: "Already in use." } : undefined,
    };
  }

  refresh();

  return { status: "success", message: "Added. It is on the tracker's list straight away." };
}

export async function saveLeaveType(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refusal = await refuseUnlessOwner();
  if (refusal) return refusal;

  const parsed = saveSchema.safeParse(read(formData));

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = createAdminClient();

  /*
    The key is not in the update.

    Not an oversight: it is what past leave requests point at. Changing it here
    would leave every request recorded against the old key pointing at nothing,
    and nobody would notice until somebody's balance was wrong.
  */
  const { error } = await supabase
    .from("leave_types")
    .update({
      label: parsed.data.label,
      description: parsed.data.description ?? "",
      is_paid: parsed.data.is_paid,
      needs_balance: parsed.data.needs_balance,
      is_active: parsed.data.is_active,
      sort_order: parsed.data.sort_order,
    })
    .eq("key", parsed.data.key);

  if (error) {
    console.error("[leave types] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Saved." };
}

/**
 * Remove a type nobody has used.
 *
 * The database refuses a built-in one outright. This refuses it first, with a
 * sentence that names the alternative — switching it off does what somebody
 * deleting it almost always meant.
 */
export async function deleteLeaveType(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const refusal = await refuseUnlessOwner();
  if (refusal) return refusal;

  const wanted = String(formData.get("key") ?? "");
  if (!wanted) return { status: "error", message: "That request did not make sense." };

  const supabase = createAdminClient();

  const { data: type } = await supabase
    .from("leave_types")
    .select("key, is_system, label")
    .eq("key", wanted)
    .maybeSingle();

  if (!type) return { status: "error", message: "That type is no longer there." };

  if (type.is_system) {
    return {
      status: "error",
      message: `${type.label} is one of the built-in types and is used across past requests. Switch it off instead — it stops being offered and the history stays readable.`,
    };
  }

  const { error } = await supabase.from("leave_types").delete().eq("key", wanted);

  if (error) {
    console.error("[leave types] delete failed:", error.message);
    return { status: "error", message: "Could not remove it." };
  }

  refresh();

  return { status: "success", message: "Removed." };
}
