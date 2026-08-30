import { z } from "zod";
import type { RecordActionState } from "@/lib/validation/records";

/**
 * Accounts, as the forms and the actions both see them.
 *
 * One file rather than a schema per action, because every rule here is a rule
 * about the same thing — who may sign in to what — and a rule stated twice is
 * a rule that will be relaxed once.
 */

/**
 * A role key, as posted.
 *
 * Only its shape is checked here. *Which* keys are real is master data — the
 * roles table is edited from this same screen — so the list cannot be baked
 * into a schema without going stale the first time an owner adds a role. The
 * action looks the key up in the master list and compares ranks, which is
 * where that question can be answered correctly.
 */
const roleKey = z
  .string()
  .trim()
  .min(1, "Pick a role.")
  .max(64, "That is not a role key.");

/**
 * The applications one login can be scoped to.
 *
 * `company` is this admin. The rest are the demo estate — each has its own
 * panel, and an account granted one of those does not reach this one. That
 * separation is the whole reason the column is an array rather than a boolean
 * (spec §14).
 *
 * ---------------------------------------------------------------------------
 * **`estate` was labelled "Task tracker" until 2026-08-30, and it never was.**
 *
 * The task tracker does not read this column at all — it decides who may sign
 * in by looking for a row in `portal.staff`. What `estate` actually unlocks is
 * the property demo, whose `is_admin()` asks for exactly that value. So the
 * checkbox did something real and told the owner it did something else, which
 * is the worst of the three possible states.
 *
 * The value is left alone and only the label corrected: renaming it would
 * quietly revoke the property demo from every account that already has it.
 *
 * **The task tracker has no entry here on purpose.** A switch that changes
 * nothing is worse than an absent one — somebody eventually ticks it, nothing
 * happens, and the panel loses a little credibility it does not get back.
 */
export const APP_ACCESS_OPTIONS = [
  { value: "company", label: "Company admin", hint: "This panel." },
  { value: "clinic", label: "Clinic demo", hint: "" },
  { value: "resto", label: "Restaurant demo", hint: "" },
  { value: "school", label: "School demo", hint: "" },
  { value: "estate", label: "Property demo", hint: "" },
  { value: "crm", label: "CRM demo", hint: "" },
  { value: "shop", label: "Store demo", hint: "" },
] as const;

const APP_VALUES = APP_ACCESS_OPTIONS.map((app) => app.value) as string[];

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "An email address is required.")
  .max(254, "That address is too long.")
  .pipe(z.email("That does not look like an email address."));

const fullName = z
  .string()
  .trim()
  .min(1, "Give the person a name.")
  .max(120, "That name is too long.");

export const createAccountSchema = z.object({
  email,
  full_name: fullName,
  role: roleKey,
});

export const saveAccountSchema = z.object({
  id: z.uuid(),
  full_name: fullName,
  role: roleKey,
  /*
    Where this person works, for the task tracker's clock.

    One text box for the pair rather than two number boxes, because that is how
    a coordinate arrives — copied out of a map in one piece. It is parsed in the
    action, where a bad paste can be answered with a sentence that names the
    fix.

    All optional. Most accounts are not employees who clock in, and an owner
    editing somebody's name should never be made to answer a question about
    geography.
  */
  address: z.string().trim().max(300).optional(),
  coordinates: z.string().trim().max(120).optional(),
  work_radius_metres: z.coerce
    .number()
    .int()
    .min(25, "Less than 25 m refuses people who are standing at the door.")
    .max(50000, "Above 50 km this is not a fence.")
    .optional(),
  app_access: z
    .array(z.string().refine((value) => APP_VALUES.includes(value)))
    .min(1, "An account with no applications cannot sign in to anything."),
  /**
   * The screens this person may reach, as ticked. Stored as the difference
   * from the role default — see `menuOverrides()`.
   */
  menu: z.array(z.string()),
});

export const accountIdSchema = z.object({ id: z.uuid() });

export const setActiveSchema = accountIdSchema.extend({
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

/**
 * Changing your own password.
 *
 * The current one is required even though the session already proves who is
 * asking. It proves something else: that the person at the keyboard is the
 * account holder rather than whoever found the laptop unlocked.
 */
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z
      .string()
      .min(12, "Use at least 12 characters. Length is what makes a password hard to guess.")
      .max(200, "That is longer than the login form will accept."),
    confirm: z.string().min(1, "Type the new password again."),
  })
  .refine((values) => values.next === values.confirm, {
    path: ["confirm"],
    message: "The two new passwords do not match.",
  })
  .refine((values) => values.next !== values.current, {
    path: ["next"],
    message: "That is the password you already have.",
  });

/**
 * What the account actions hand back.
 *
 * Declared here rather than beside the actions because a `"use server"` module
 * may only export functions — every other export becomes a callable endpoint,
 * which a constant plainly is not.
 *
 * `credentials` carries the generated password **only when it could not be
 * delivered**. If the email went out it is not repeated on screen: a password
 * left on a monitor in an open-plan office is exactly the leak that generating
 * and emailing it exists to avoid. With no SMTP configured there is nowhere
 * else for it to go, and saying so plainly beats an account nobody can use.
 */
export interface AccountActionState extends RecordActionState {
  credentials?: {
    email: string;
    password: string;
    reason: "created" | "reset";
  };
}

export const initialAccountState: AccountActionState = {
  status: "idle",
  message: "",
};
