"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { GRANTABLE_ITEMS } from "@/lib/auth/menu";
import { roleByKey, type RoleDefinition } from "@/lib/auth/roles";
import { getStaffSession, type StaffSession } from "@/lib/auth/session";
import { INVALIDATION_MAP } from "@/lib/cache/tags";
import { getRoles } from "@/lib/queries/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createRoleSchema,
  roleKeySchema,
  saveRoleSchema,
} from "@/lib/validation/roles";
import { fieldErrors, type RecordActionState } from "@/lib/validation/records";

/**
 * Role mutations.
 *
 * Roles became master data on 2026-08-27, on the owner's instruction, and this
 * is the screen behind that. Every rule here exists because a role is the one
 * row where a careless edit is an access-control incident rather than a typo:
 *
 *   nobody may create or edit a role ranked above their own;
 *   a built-in role keeps its key and cannot be deleted, though everything
 *     else about it — its name, its rank, its menu — can be changed;
 *   at least one active role must be able to manage accounts, always;
 *   a role in use is not deleted out from under the accounts holding it.
 *
 * The last two are enforced in the database as well, by a deferred constraint
 * trigger and a foreign key. These checks exist so the answer arrives as a
 * sentence beside the form rather than as a constraint violation.
 */

interface Actor {
  session: StaffSession;
  roles: RoleDefinition[];
}

async function actor(): Promise<Actor | RecordActionState> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!session.role.is_owner) {
    return { status: "error", message: "Only an owner can change roles." };
  }

  return { session, roles: await getRoles() };
}

function isRefusal(value: Actor | RecordActionState): value is RecordActionState {
  return "status" in value;
}

/**
 * Clear the cached list, then the screen.
 *
 * The order matters. The tag is what the admin shell reads to resolve every
 * signed-in person's menu, so a path revalidation on its own would repaint this
 * screen from a list that had already changed underneath it.
 */
function refresh() {
  for (const tag of INVALIDATION_MAP.roles()) updateTag(tag);
  revalidatePath("/admin/users");
}

/** Screens a role's default menu may name. The grantable ones, plus `users`. */
const MENU_KEYS = new Set([...GRANTABLE_ITEMS.map((item) => item.key), "users"]);

// ---------------------------------------------------------------------------

/**
 * Add a role.
 *
 * Two fields, and it starts with nothing: no capabilities, no menu, inactive
 * until somebody says otherwise is one step too far — it starts active but
 * powerless, which is visible and harmless. Giving it a name and then deciding
 * what it can do is the order people actually think in, and a role created
 * with a copy of somebody else's capabilities is a role nobody re-reads.
 */
export async function createRole(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = createRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  if (roleByKey(who.roles, parsed.data.key)) {
    return {
      status: "error",
      message: "There is already a role with that key.",
      fieldErrors: { key: "Already in use. Pick another key." },
    };
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("roles").insert({
    key: parsed.data.key,
    label: parsed.data.label,
    description: "",
    rank: 0,
    is_staff: false,
    can_manage_leads: false,
    is_owner: false,
    default_menu: [],
    /* And nothing in the portal either. A new role reaches no screen anywhere
       until somebody decides it should — the same rule the website's own menu
       has always followed, now that the portal's is master data too. */
    portal_menu: [],
    is_system: false,
    is_active: true,
    sort_order: (who.roles.at(-1)?.sort_order ?? 0) + 10,
  });

  if (error) {
    console.error("[roles] create failed:", error.message);
    return { status: "error", message: "Could not add the role." };
  }

  refresh();

  redirect(`/admin/users?tab=roles&role=${parsed.data.key}`);
}

/**
 * Save a role.
 *
 * The rank ceiling is applied twice over: to the role as it is now, so nobody
 * edits something above them, and to the rank being set, so nobody lifts a role
 * they can edit above themselves and then holds it.
 */
export async function saveRole(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = saveRoleSchema.safeParse({
    key: formData.get("key"),
    label: formData.get("label"),
    description: formData.get("description") ?? "",
    rank: formData.get("rank"),
    is_staff: formData.get("is_staff"),
    can_manage_leads: formData.get("can_manage_leads"),
    is_owner: formData.get("is_owner"),
    is_active: formData.get("is_active"),
    default_menu: formData.getAll("default_menu"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const existing = roleByKey(who.roles, parsed.data.key);
  if (!existing) return { status: "error", message: "That role no longer exists." };

  const ceiling = who.session.role.rank;

  if (existing.rank > ceiling) {
    return {
      status: "error",
      message: "That role has more authority than your own. You cannot change it.",
    };
  }

  if (parsed.data.rank > ceiling) {
    return {
      status: "error",
      message: "You cannot give a role more authority than you have yourself.",
      fieldErrors: { rank: `The highest you can set is ${ceiling}.` },
    };
  }

  // The last way in is never closed. The database refuses this too, in a
  // deferred trigger; the point of asking here is that the answer arrives as a
  // sentence rather than as an exception.
  if (existing.is_owner && (!parsed.data.is_owner || !parsed.data.is_active)) {
    const others = who.roles.filter(
      (role) => role.key !== existing.key && role.is_owner && role.is_active,
    );

    if (others.length === 0) {
      return {
        status: "error",
        message:
          "This is the only role that can manage accounts. Give another role that first.",
      };
    }
  }

  // A role that manages accounts but cannot reach the panel is a contradiction
  // that produces a locked-out owner rather than an error, so it is refused
  // where it can still be explained.
  if (parsed.data.is_owner && !parsed.data.is_staff) {
    return {
      status: "error",
      message:
        "A role that manages accounts has to be able to reach the admin panel. Tick that as well.",
    };
  }

  const menu = parsed.data.default_menu.filter((key) => MENU_KEYS.has(key));

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("roles")
    .update({
      label: parsed.data.label,
      description: parsed.data.description,
      rank: parsed.data.rank,
      is_staff: parsed.data.is_staff,
      can_manage_leads: parsed.data.can_manage_leads,
      is_owner: parsed.data.is_owner,
      is_active: parsed.data.is_active,
      default_menu: menu,
    })
    .eq("key", parsed.data.key);

  if (error) {
    console.error("[roles] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return {
    status: "success",
    message: "Everyone holding this role sees the change on their next request.",
  };
}

/**
 * Delete a role.
 *
 * Refused for a built-in one, and refused while any account still holds it —
 * the foreign key would refuse it anyway, and an error about a constraint is
 * not an answer anybody can act on. Moving the people off it first is the
 * answer, so that is what it says.
 */
export async function deleteRole(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = roleKeySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const existing = roleByKey(who.roles, parsed.data.key);
  if (!existing) return { status: "error", message: "That role no longer exists." };

  if (existing.is_system) {
    return {
      status: "error",
      message: `The ${existing.label} role is part of the application and cannot be deleted. Switch it off instead if nobody should hold it.`,
    };
  }

  if (existing.rank > who.session.role.rank) {
    return {
      status: "error",
      message: "That role has more authority than your own. You cannot delete it.",
    };
  }

  const supabase = createAdminClient();

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", parsed.data.key);

  if (count && count > 0) {
    return {
      status: "error",
      message: `${count} ${count === 1 ? "account holds" : "accounts hold"} this role. Move them to another role first.`,
    };
  }

  const { error } = await supabase.from("roles").delete().eq("key", parsed.data.key);

  if (error) {
    console.error("[roles] delete failed:", error.message);
    return { status: "error", message: "Could not delete it. Nothing was changed." };
  }

  refresh();

  return { status: "success", message: "Deleted." };
}
