import { buildSchema, emptyContent, type Field } from "@/lib/sections/fields";

/**
 * A content record, described the way a section's content is described.
 *
 * The field vocabulary is deliberately the one in `lib/sections/fields.ts`
 * rather than a second one for rows. A service's summary and a hero section's
 * subheading are the same kind of thing to the person typing them, and they
 * should be the same kind of thing to the code: one set of descriptors, one
 * recursive input component, one schema builder. What a record adds is a
 * grouping — a service has twenty-one editable columns, and twenty-one boxes
 * in a single column is a wall rather than a form.
 *
 * A fieldset is presentation only. It has no effect on the schema, the stored
 * shape or the paths errors are reported at, so a field can be moved between
 * fieldsets without touching anything that reads it.
 */
export interface Fieldset {
  legend: string;
  /** One sentence on what this group of fields is for. Optional. */
  hint?: string;
  fields: Field[];
}

/** Every field across every fieldset, in the order they are shown. */
export function fieldsOf(fieldsets: Fieldset[]): Field[] {
  return fieldsets.flatMap((fieldset) => fieldset.fields);
}

/** The schema for a whole record, derived from the fields the form renders. */
export function recordSchema(fieldsets: Fieldset[]) {
  return buildSchema(fieldsOf(fieldsets));
}

/** An empty record of the right shape — used when one is created. */
export function emptyRecord(fieldsets: Fieldset[]): Record<string, unknown> {
  return emptyContent(fieldsOf(fieldsets));
}
