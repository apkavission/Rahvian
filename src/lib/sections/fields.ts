import { z } from "zod";
import {
  IMAGE_FIELDS,
  specLabel,
  type ImageFieldKey,
  type ImageFieldSpec,
  type MediaOption,
} from "@/lib/media/image-fields";

/**
 * The field vocabulary a section's content is described in.
 *
 * One declaration per field drives three things that would otherwise drift
 * apart: the Zod schema the Server Action validates against, the form the
 * admin sees, and the shape the section component reads. The registry's own
 * note asked for exactly this — "the admin form fields are generated from
 * those same schemas, so the work is not duplicated" — and deriving both from
 * a descriptor is the direction that actually holds, because introspecting a
 * Zod schema to recover labels, help text and field order recovers none of it.
 *
 * Deliberately small. Nine kinds covered all nineteen section types, and the
 * tenth — `image` — was added only once there was a media library for it to
 * pick from. It earns its place because an image field is not a select over
 * ids: it has to state the exact size it wants and say when the chosen file
 * does not match, which is a rule the whole estate is held to.
 */

export type FieldKind =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "list"
  | "checkboxes"
  | "group"
  | "repeater"
  | "image";

interface BaseField {
  name: string;
  label: string;
  /** Shown under the control. Say what the field is for, not what it is. */
  hint?: string;
  required?: boolean;
}

export interface TextField extends BaseField {
  kind: "text" | "textarea";
  placeholder?: string;
  max?: number;
  /**
   * A shape the value has to match — a slug, a hex colour, a phone number.
   *
   * Carried as a descriptor rather than checked in the form, because the
   * Server Action validates against the schema built from these same
   * descriptors: a rule written only in the input is a rule a posted request
   * never sees.
   */
  pattern?: { re: RegExp; message: string };
  /**
   * Visible lines, for a textarea. Ignored by a single-line text field.
   *
   * Four is right for a paragraph of copy and wrong for a whole article: a
   * markdown body typed through a four-line window is a body nobody proofreads.
   */
  rows?: number;
}

export interface NumberField extends BaseField {
  kind: "number";
  min?: number;
  max?: number;
}

export interface BooleanField extends BaseField {
  kind: "boolean";
}

export interface SelectField extends BaseField {
  kind: "select";
  options: { value: string; label: string }[];
}

/** An array of plain strings — one per line in the editor. */
export interface ListField extends BaseField {
  kind: "list";
  itemLabel?: string;
}

/** An array drawn from a fixed set. */
export interface CheckboxesField extends BaseField {
  kind: "checkboxes";
  options: { value: string; label: string }[];
}

/** A fixed object, such as a call to action or an empty state. */
export interface GroupField extends BaseField {
  kind: "group";
  fields: Field[];
}

/**
 * One image, chosen from the media library.
 *
 * The spec is the field's entry in `IMAGE_FIELDS` — the one table of declared
 * sizes — rather than two loose numbers, so a field cannot exist without a
 * declared size and no second place can disagree about what that size is.
 *
 * The assets travel on the descriptor, as every other picker's options do. It
 * is one array shared by reference across every image field on a form, so a
 * form with three of them carries the library once.
 */
export interface ImageField extends BaseField {
  kind: "image";
  spec: ImageFieldSpec;
  assets: MediaOption[];
}

/** An array of objects, such as feature cards or story paragraphs. */
export interface RepeaterField extends BaseField {
  kind: "repeater";
  fields: Field[];
  /** Singular noun for the add button: "Add a feature". */
  itemLabel: string;
  max?: number;
}

export type Field =
  | TextField
  | NumberField
  | BooleanField
  | SelectField
  | ListField
  | CheckboxesField
  | GroupField
  | RepeaterField
  | ImageField;

/**
 * The Zod schema for one field.
 *
 * Optional fields accept the empty string and become `undefined`, so a cleared
 * input is stored as absent rather than as a blank that renders an empty line
 * on the public page.
 */
function schemaFor(field: Field): z.ZodTypeAny {
  switch (field.kind) {
    case "text":
    case "textarea": {
      const base = z.string().trim().max(field.max ?? 5000, `Keep this under ${field.max ?? 5000} characters.`);
      const pattern = field.pattern;

      if (field.required) {
        const required = base.min(1, `${field.label} is required.`);
        return pattern ? required.regex(pattern.re, pattern.message) : required;
      }

      // An optional field with a pattern still has to accept being empty:
      // the rule describes what a value must look like, not that there is one.
      const optional = pattern
        ? base.refine((value) => value === "" || pattern.re.test(value), pattern.message)
        : base;

      return optional.transform((value) => (value === "" ? undefined : value)).optional();
    }

    case "number": {
      let base = z.number();
      if (field.min !== undefined) base = base.min(field.min);
      if (field.max !== undefined) base = base.max(field.max);
      return field.required ? base : base.optional();
    }

    case "boolean":
      return z.boolean().optional();

    case "select": {
      const values = field.options.map((option) => option.value);

      if (field.required) {
        return z.string().refine((value) => values.includes(value), "Pick one of the options.");
      }

      // An optional select renders a "Not set" entry whose value is the empty
      // string, so the empty string has to be a valid answer. Without this the
      // one choice the control offers for "none" is the one the schema refuses,
      // and clearing a field fails with "Pick one of the options."
      return z
        .string()
        .refine(
          (value) => value === "" || values.includes(value),
          "Pick one of the options.",
        )
        .transform((value) => (value === "" ? undefined : value))
        .optional();
    }

    case "list": {
      const base = z.array(z.string().trim().min(1)).max(60);
      return field.required ? base.min(1, `${field.label} needs at least one entry.`) : base.optional();
    }

    case "checkboxes": {
      const values = field.options.map((option) => option.value);
      const base = z.array(z.string().refine((value) => values.includes(value)));
      return field.required ? base.min(1) : base.optional();
    }

    case "group": {
      const base = buildSchema(field.fields);
      return field.required ? base : base.optional();
    }

    case "repeater": {
      const base = z.array(buildSchema(field.fields)).max(field.max ?? 40);
      return field.required
        ? base.min(1, `${field.label} needs at least one entry.`)
        : base.optional();
    }

    case "image": {
      // The value is an id from the library, and only an id the form actually
      // offered. Checked the way a select is: a posted request naming a row
      // that is not an asset — or is not one this form listed — is refused
      // rather than written, and the empty string is how "none" is said.
      const ids = field.assets.map((asset) => asset.id);

      if (field.required) {
        return z
          .string()
          .refine((value) => ids.includes(value), `${field.label} is required.`);
      }

      return z
        .string()
        .refine(
          (value) => value === "" || ids.includes(value),
          "That file is not in the media library.",
        )
        .transform((value) => (value === "" ? undefined : value))
        .optional();
    }
  }
}

/** The schema for a whole section's content. */
export function buildSchema(fields: Field[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  return z.object(
    Object.fromEntries(fields.map((field) => [field.name, schemaFor(field)])),
  );
}

/**
 * An empty value of the right shape.
 *
 * Used when a section is added and when a repeater gains a row. Every kind has
 * one, so the editor never has to special-case an undefined it created itself.
 */
export function emptyValue(field: Field): unknown {
  switch (field.kind) {
    case "text":
    case "textarea":
      return "";
    case "number":
      return undefined;
    case "boolean":
      return false;
    case "select":
      return field.options[0]?.value ?? "";
    case "list":
    case "checkboxes":
      return [];
    case "group":
      return emptyContent(field.fields);
    case "repeater":
      return [];
    case "image":
      return "";
  }
}

export function emptyContent(fields: Field[]): Record<string, unknown> {
  return Object.fromEntries(fields.map((field) => [field.name, emptyValue(field)]));
}

/**
 * The background choices, declared once.
 *
 * Not a content field: the background is `page_sections.background_variant`, a
 * column, and the renderer merges it into the content it hands the component.
 * Listing it among a section's own fields would create a second place to set
 * one thing — which is exactly the state that had the column being written and
 * ignored until the renderer was fixed.
 */
export const BACKGROUND_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "muted", label: "Muted" },
  { value: "contrast", label: "Contrast (dark)" },
] as const;

/**
 * An image field, built from the one table of declared sizes.
 *
 * The only way to declare one. The label, the size and the sentence saying
 * where the picture is seen all come from `IMAGE_FIELDS`, so a field cannot
 * exist without a declared size and nine forms cannot drift into nine different
 * answers about what that size is.
 *
 * The hint leads with the number, because that is what someone needs *before*
 * they open their folder of photographs — not after they have chosen one.
 */
export function imageField(
  name: string,
  key: ImageFieldKey,
  assets: MediaOption[],
  options: { required?: boolean } = {},
): ImageField {
  const spec = IMAGE_FIELDS[key];

  return {
    kind: "image",
    name,
    label: spec.label,
    hint: `${specLabel(spec)} — ${spec.use}`,
    spec,
    assets,
    required: options.required,
  };
}
