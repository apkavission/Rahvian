import { z } from "zod";

/**
 * A page's own fields — everything except its sections.
 *
 * The slug is constrained to the same pattern the database enforces, so a bad
 * one is refused with a sentence rather than with a check-constraint violation
 * nobody can read.
 */
export const pageMetaSchema = z.object({
  page_id: z.uuid(),

  title: z
    .string()
    .trim()
    .min(1, "A page needs a title.")
    .max(160, "That title is too long."),

  slug: z
    .string()
    .trim()
    .min(1, "A page needs a slug.")
    .max(120, "That slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers and single hyphens only — and one segment, no slashes.",
    ),

  status: z.enum(["draft", "published", "archived"]),

  seo_title: optionalText(160),
  seo_description: optionalText(400),
  canonical_url: optionalText(500),
  schema_type: optionalText(60),
  noindex: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional(),
});

function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();
}

/**
 * A new page.
 *
 * Only the two things a page cannot exist without. Everything else — the SEO
 * fields, the schema type, the sections — is added in the builder, which is
 * where the person already is once the page exists.
 */
export const createPageSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Give the page a title.")
    .max(160, "That title is too long."),

  slug: z
    .string()
    .trim()
    .min(1, "Give the page an address.")
    .max(120, "That slug is too long.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Lowercase letters, numbers and single hyphens only — and one segment, no slashes.",
    ),
});

export const addSectionSchema = z.object({
  page_id: z.uuid(),
  type: z.string().min(1),
});

export const sectionIdSchema = z.object({
  page_id: z.uuid(),
  section_id: z.uuid(),
});

export const moveSectionSchema = sectionIdSchema.extend({
  direction: z.enum(["up", "down"]),
});

export const saveSectionSchema = sectionIdSchema.extend({
  type: z.string().min(1),
  background_variant: z.enum(["default", "muted", "contrast"]),
  /** The content object, as JSON. See the note in the Server Action. */
  content: z.string(),
});

export interface PageActionState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const initialPageActionState: PageActionState = {
  status: "idle",
  message: "",
};

export const PAGE_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
] as const;
