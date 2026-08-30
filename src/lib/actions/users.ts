"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getStaffSession, type StaffSession } from "@/lib/auth/session";
import { menuOverrides } from "@/lib/auth/menu";
import { generatePassword } from "@/lib/auth/password";
import { assignableRoles, roleByKey, type RoleDefinition } from "@/lib/auth/roles";
import { getEmailBrand } from "@/lib/email/brand";
import { sendMail } from "@/lib/email/mailer";
import { buildAccountCredentials } from "@/lib/email/templates/account-credentials";
import { countOtherOwners } from "@/lib/queries/users-admin";
import { getRoles } from "@/lib/queries/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  accountIdSchema,
  changePasswordSchema,
  createAccountSchema,
  saveAccountSchema,
  setActiveSchema,
  type AccountActionState,
} from "@/lib/validation/users";
import { fieldErrors, type RecordActionState } from "@/lib/validation/records";
import { parseCoordinates } from "@/lib/coordinates";

/**
 * Account mutations.
 *
 * The rules these enforce are the standing rule on accounts, in code:
 *
 *   an account is created for you, never by you — sign-up is disabled at the
 *     Supabase project and this is the only way one comes into existence;
 *   nobody, including the owner pressing the button, can read an existing
 *     password back — a reset issues a new generated one to the address;
 *   blocking is one switch and it is absolute, and it is never a deletion;
 *   nobody may create or edit an account into a role above their own;
 *   the last way in is never closed.
 *
 * Every write goes through the service-role client, because creating an auth
 * user and setting a password are Auth admin operations the browser must never
 * be able to perform. Authorisation is therefore established here first, in
 * full, rather than left to RLS — this is the one place in the application
 * where the row policies are not the backstop.
 */

interface Actor {
  session: StaffSession;
  roles: RoleDefinition[];
}

/**
 * Who is asking, and may they.
 *
 * `is_owner` on the role rather than a list of role keys: which roles carry
 * account management is master data now, and a second opinion about it here
 * would be the copy that goes stale.
 */
async function actor(): Promise<Actor | AccountActionState> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!session.role.is_owner) {
    return { status: "error", message: "Only an owner can manage accounts." };
  }

  return { session, roles: await getRoles() };
}

function isRefusal(value: Actor | AccountActionState): value is AccountActionState {
  return "status" in value;
}

function refresh() {
  revalidatePath("/admin/users");
}

/**
 * The role this actor is allowed to set, or a refusal.
 *
 * Rank, compared. An owner cannot mint a super admin, and nobody can promote
 * themselves by editing their own account — the rank test is the whole of that
 * rule and it is applied to the role being *set*, not to the one on the form
 * when it loaded.
 */
function checkRole(
  { session, roles }: Actor,
  key: string,
): RoleDefinition | AccountActionState {
  const role = roleByKey(roles, key);

  if (!role || !role.is_active) {
    return {
      status: "error",
      message: "That role no longer exists.",
      fieldErrors: { role: "Pick a role from the list." },
    };
  }

  if (!assignableRoles(roles, session.role).some((option) => option.key === role.key)) {
    return {
      status: "error",
      message: "You cannot give somebody a role with more authority than your own.",
      fieldErrors: { role: "This role outranks yours." },
    };
  }

  return role;
}

function isRoleRefusal(
  value: RoleDefinition | AccountActionState,
): value is AccountActionState {
  return "status" in value;
}

/**
 * Send the password, and say honestly whether it went.
 *
 * Sending never throws — the account has already been created by the time this
 * runs, and a refused SMTP connection must not report a failure that leaves an
 * owner believing no account exists. The result decides whether the password is
 * shown on screen instead.
 */
async function deliver(
  to: string,
  name: string,
  password: string,
  roleLabel: string,
  reason: "created" | "reset",
): Promise<boolean> {
  try {
    const brand = await getEmailBrand();
    const message = await buildAccountCredentials(
      { name, email: to, password, roleLabel, reason },
      brand,
    );
    const result = await sendMail(message);
    return result.sent;
  } catch (error) {
    console.error("[users] credentials email failed:", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Open an account.
 *
 * Created with its email already confirmed, deliberately. The person is being
 * given an account by their employer, not signing up to a service, and a
 * confirmation link that expires unread in an inbox nobody checks is the usual
 * reason a new colleague cannot get in on their first morning.
 *
 * The profile row already exists by the time the insert returns — a trigger on
 * `auth.users` creates one, conservatively, at `editor` with company access
 * only. This raises it to what was asked for. If that second write fails the
 * account still exists as an editor rather than as nothing, which is the safe
 * direction for a half-finished creation to fail in.
 */
export async function createAccount(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const role = checkRole(who, parsed.data.role);
  if (isRoleRefusal(role)) return role;

  const supabase = createAdminClient();
  const password = generatePassword();

  const { data, error } = await supabase.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error || !data.user) {
    const message = error?.message ?? "";

    // The Auth API says "already been registered" for an address that has an
    // account. Reported as a field error rather than a general failure,
    // because the fix is in the field.
    if (/already/i.test(message)) {
      return {
        status: "error",
        message: "That address already has an account.",
        fieldErrors: {
          email: "This address is already in use. Edit the existing account instead.",
        },
      };
    }

    console.error("[users] create failed:", message);
    return { status: "error", message: "Could not create the account." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      role: role.key,
      is_active: true,
      app_access: ["company"],
      menu_extra: [],
      menu_denied: [],
    })
    .eq("id", data.user.id);

  if (profileError) {
    console.error("[users] profile update after create failed:", profileError.message);
    return {
      status: "error",
      message:
        "The account was created but its role could not be set. Open it below and save the role again.",
    };
  }

  const sent = await deliver(
    parsed.data.email,
    parsed.data.full_name,
    password,
    role.label,
    "created",
  );

  refresh();

  if (sent) {
    redirect(`/admin/users?account=${data.user.id}&sent=1`);
  }

  // Not redirected, on purpose: the password is in this state and a redirect
  // would throw it away. It is shown once, on the form that created it.
  return {
    status: "success",
    message: `The account is ready. Email is not configured, so give ${parsed.data.full_name} the password below yourself — it cannot be read again.`,
    credentials: { email: parsed.data.email, password, reason: "created" },
  };
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

export async function saveAccount(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = saveAccountSchema.safeParse({
    id: formData.get("id"),
    full_name: formData.get("full_name"),
    role: formData.get("role"),
    app_access: formData.getAll("app_access"),
    menu: formData.getAll("menu"),
    address: formData.get("address") || undefined,
    coordinates: formData.get("coordinates") || undefined,
    work_radius_metres: formData.get("work_radius_metres") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const role = checkRole(who, parsed.data.role);
  if (isRoleRefusal(role)) return role;

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!target) return { status: "error", message: "That account no longer exists." };

  // An account may only be edited by somebody who outranks what it currently
  // is. Without this an owner could edit a super admin down to an editor and
  // take the estate with it.
  const current = roleByKey(who.roles, target.role);
  if (current && current.rank > who.session.role.rank) {
    return {
      status: "error",
      message: "That account has more authority than yours. You cannot change it.",
    };
  }

  const self = target.id === who.session.userId;

  if (self && role.key !== target.role) {
    return {
      status: "error",
      message:
        "You cannot change your own role. Ask another owner to do it, so there is always somebody who can undo it.",
      fieldErrors: { role: "Not on your own account." },
    };
  }

  if (self && !parsed.data.app_access.includes("company")) {
    return {
      status: "error",
      message: "Removing your own access to this panel would lock you out of it.",
    };
  }

  // Demoting the last account that can manage accounts closes the last way in.
  if (!self && current?.is_owner && !role.is_owner) {
    const others = await countOtherOwners(target.id);
    if (others < 0) {
      return {
        status: "error",
        message: "Could not check how many owners are left, so nothing was changed.",
      };
    }
    if (others === 0) {
      return {
        status: "error",
        message:
          "This is the only account that can manage accounts. Give somebody else that role first.",
      };
    }
  }

  /*
    The work point, read from what was pasted.

    Refused with a sentence rather than saved wrongly: a mistyped pair does not
    fail here, it fails at nine in the morning when somebody cannot clock in and
    has no idea why. Empty is a real answer meaning "no fence", which is how one
    is removed.
  */
  const point = parseCoordinates(parsed.data.coordinates);

  if (!point.ok) {
    return {
      status: "error",
      message: point.message,
      fieldErrors: { coordinates: point.message },
    };
  }

  const { menu_extra, menu_denied } = menuOverrides(role, parsed.data.menu);

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      role: role.key,
      app_access: parsed.data.app_access,
      menu_extra,
      menu_denied,

      /* The workplace, for the tracker's clock-in check. Nulls are meaningful:
         clearing the box removes the fence, and the tracker then records a
         clock-in as unchecked rather than refusing it. */
      address: parsed.data.address ?? null,
      work_latitude: point.point?.latitude ?? null,
      work_longitude: point.point?.longitude ?? null,
      work_radius_metres: parsed.data.work_radius_metres ?? 200,
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[users] save failed:", error.message);
    return { status: "error", message: "Could not save. Nothing was changed." };
  }

  refresh();

  return {
    status: "success",
    message: "It applies on their next request — they do not need to sign in again.",
  };
}

// ---------------------------------------------------------------------------
// Block and unblock
// ---------------------------------------------------------------------------

/**
 * The one switch, and it is absolute.
 *
 * `is_active = false` ends access everywhere at once: the login refuses it
 * after authenticating, `getStaffSession()` treats it as signed out on the very
 * next request, and every policy in the schema tests the flag so the database
 * refuses the rows as well.
 *
 * It is never a deletion. The person's notes, assignments and history stay
 * attached to them, which is what you want the day somebody leaves and also
 * the day they come back.
 */
export async function setAccountActive(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = setActiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!target) return { status: "error", message: "That account no longer exists." };

  if (target.id === who.session.userId) {
    return {
      status: "error",
      message: "You cannot block your own account.",
    };
  }

  const current = roleByKey(who.roles, target.role);

  if (current && current.rank > who.session.role.rank) {
    return {
      status: "error",
      message: "That account has more authority than yours. You cannot block it.",
    };
  }

  if (!parsed.data.active && current?.is_owner) {
    const others = await countOtherOwners(target.id);
    if (others < 0) {
      return {
        status: "error",
        message: "Could not check how many owners are left, so nothing was changed.",
      };
    }
    if (others === 0) {
      return {
        status: "error",
        message:
          "This is the only account that can manage accounts. Blocking it would lock everybody out.",
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: parsed.data.active })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[users] block failed:", error.message);
    return { status: "error", message: "Could not change it. Nothing was changed." };
  }

  refresh();

  return {
    status: "success",
    message: parsed.data.active
      ? `${target.full_name || "The account"} can sign in again.`
      : `${target.full_name || "The account"} is signed out everywhere, from their next request.`,
  };
}

// ---------------------------------------------------------------------------
// Reset a password
// ---------------------------------------------------------------------------

/**
 * Issue a new password.
 *
 * Generated and sent to the account's own address rather than chosen by the
 * owner pressing the button. An owner who types a colleague's password knows
 * their colleague's password, and every explanation of why that is fine is
 * wrong the first time it matters.
 *
 * The old password stops working the instant this succeeds, which is also what
 * makes this the right button for "they have left their laptop on a train" —
 * followed by blocking the account, which is the one on the same panel.
 */
export async function resetAccountPassword(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const who = await actor();
  if (isRefusal(who)) return who;

  const parsed = accountIdSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "That request did not make sense." };
  }

  const supabase = createAdminClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (!target) return { status: "error", message: "That account no longer exists." };

  const current = roleByKey(who.roles, target.role);
  if (current && current.rank > who.session.role.rank) {
    return {
      status: "error",
      message: "That account has more authority than yours. You cannot reset its password.",
    };
  }

  const { data: user, error: readError } = await supabase.auth.admin.getUserById(
    parsed.data.id,
  );

  if (readError || !user.user?.email) {
    console.error("[users] could not read the address:", readError?.message);
    return {
      status: "error",
      message: "Could not find an email address for that account, so nothing was changed.",
    };
  }

  const password = generatePassword();

  const { error } = await supabase.auth.admin.updateUserById(parsed.data.id, {
    password,
  });

  if (error) {
    console.error("[users] password reset failed:", error.message);
    return { status: "error", message: "Could not reset the password. Nothing was changed." };
  }

  const sent = await deliver(
    user.user.email,
    target.full_name,
    password,
    current?.label ?? target.role,
    "reset",
  );

  refresh();

  if (sent) {
    return {
      status: "success",
      message: `A new password is on its way to ${user.user.email}. The old one has stopped working.`,
    };
  }

  return {
    status: "success",
    message:
      "The password has been reset, but email is not configured — give them the new one below yourself. It cannot be read again.",
    credentials: { email: user.user.email, password, reason: "reset" },
  };
}

// ---------------------------------------------------------------------------
// Your own password
// ---------------------------------------------------------------------------

/**
 * Change your own password.
 *
 * Available to everyone who can sign in, not only to owners — it is the one
 * thing on this subject that is nobody else's business. The current password
 * is required even though the session already proves who is asking, because it
 * proves something else: that the person at the keyboard is the account holder
 * rather than whoever found the laptop unlocked.
 *
 * Verified by signing in again with it rather than by any check of our own.
 * There is no way to read a stored password back, and there should not be.
 */
export async function changeOwnPassword(
  _previous: RecordActionState,
  formData: FormData,
): Promise<RecordActionState> {
  const session = await getStaffSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  if (!session.email) {
    return {
      status: "error",
      message: "This account has no email address, so its password cannot be changed here.",
    };
  }

  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrors(parsed.error.issues),
    };
  }

  const supabase = await createClient();

  const { error: wrong } = await supabase.auth.signInWithPassword({
    email: session.email,
    password: parsed.data.current,
  });

  if (wrong) {
    return {
      status: "error",
      message: "That is not your current password.",
      fieldErrors: { current: "This does not match the password you have now." },
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.next });

  if (error) {
    console.error("[users] own password change failed:", error.message);
    return { status: "error", message: "Could not change it. Your password is unchanged." };
  }

  return {
    status: "success",
    message: "Use the new one next time you sign in. Other devices stay signed in.",
  };
}
