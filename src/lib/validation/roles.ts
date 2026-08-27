import { z } from "zod";

/**
 * Roles, as the form and the action both see them.
 *
 * A role is the most consequential row in the database — it decides what every
 * account holding it may do — so the shape is checked in one place and the
 * questions that need the master list (does this outrank mine? is it the last
 * one that can manage accounts?) are answered in the action, where the list is
 * available.
 */

/**
 * The key rule, stated identically to the check constraint on the table.
 *
 * A form that accepts what the database refuses is worse than one that refuses
 * too much: the message comes back as a constraint violation nobody can read,
 * at the end of filling in a form.
 */
export const ROLE_KEY_PATTERN = {
  re: /^[a-z][a-z0-9_]*$/,
  message:
    "Lowercase letters, numbers and underscores, starting with a letter — like content_lead.",
} as const;

const key = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Give the role a key.")
  .max(64, "That key is too long.")
  .regex(ROLE_KEY_PATTERN.re, ROLE_KEY_PATTERN.message);

const label = z
  .string()
  .trim()
  .min(1, "Give the role a name.")
  .max(60, "That name is too long to fit beside an account.");

const description = z
  .string()
  .trim()
  .max(400, "Keep this to a sentence or two.")
  .transform((value) => value);

/**
 * Authority, as a number.
 *
 * Bounded well below any real use so that a mistyped rank cannot silently
 * create something that outranks every owner in the system.
 */
const rank = z.coerce
  .number()
  .int("Use a whole number.")
  .min(0, "The lowest rank is 0.")
  .max(100, "The highest rank is 100.");

/** A checkbox that is either present in the form data or absent. */
const flag = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.undefined(), z.null()])
  .transform((value) => value === "on" || value === "true");

export const createRoleSchema = z.object({
  key,
  label,
});

export const saveRoleSchema = z.object({
  /** The row being edited. A system role's key never changes; this is the id. */
  key,
  label,
  description,
  rank,
  is_staff: flag,
  can_manage_leads: flag,
  is_owner: flag,
  is_active: flag,
  default_menu: z.array(z.string()),
});

export const roleKeySchema = z.object({ key });
