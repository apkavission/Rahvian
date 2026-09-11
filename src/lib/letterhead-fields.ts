import type { LetterheadCompany } from "@/lib/letterhead";

/**
 * The blocks a letterhead is made of.
 *
 * ---------------------------------------------------------------------------
 * **Why a list of blocks rather than a set of switches.**
 *
 * The first version of this screen had three booleans — print the tagline,
 * print the website, print the GSTIN — and the owner's next instruction made
 * it plain that no number of booleans would do:
 *
 *   > company me jitna bhi chej hota h wo sab hona chiaye and jo h add field ka
 *   > bhi de dena ho sakta h ki jada ya kam ho and jo h conetnt ko drap and
 *   > drop kar sake wo bhi dekhna and jo h bano mene koi field khali chod h to
 *   > wo letter me khali nhi hona chiaye wo gayab hi ho jayega
 *
 * A switch cannot add a PAN, a Udyam number, a branch address or a bank
 * account; it cannot say what order the blocks go in; and a column per field
 * would mean a migration every time the company gains a registration. A list
 * does all three — adding a field appends to it, dragging reorders it, and the
 * order on the page is the order in the array.
 *
 * ---------------------------------------------------------------------------
 * **And the rule that made the list necessary: an empty field vanishes.**
 * `resolveFields()` is the only place that decides what appears, so the rule
 * cannot be half-applied.
 */

export const FIELD_SOURCES = [
  {
    key: "legalName",
    label: "Registered name",
    hint: "The name on the certificate of incorporation.",
  },
  { key: "tagline", label: "Tagline", hint: "The line under the name." },
  {
    key: "address",
    label: "Registered office address",
    hint: "From Settings, on as many lines as it has.",
  },
  { key: "phone", label: "Phone", hint: "" },
  { key: "whatsapp", label: "WhatsApp", hint: "" },
  { key: "email", label: "Email", hint: "" },
  { key: "website", label: "Website", hint: "" },
  { key: "workingHours", label: "Working hours", hint: "" },
  { key: "cin", label: "CIN", hint: "Required on every business letter." },
  { key: "gst", label: "GSTIN", hint: "Conventional rather than required." },
  { key: "socials", label: "Social profiles", hint: "Whatever is filled in under Settings." },
  {
    key: "custom",
    label: "Something else",
    hint: "A PAN, a Udyam number, a bank account, a second office — anything typed in here.",
  },
] as const;

export type FieldSource = (typeof FIELD_SOURCES)[number]["key"];

export function isFieldSource(value: unknown): value is FieldSource {
  return typeof value === "string" && FIELD_SOURCES.some((source) => source.key === value);
}

/**
 * Where on the page a block sits.
 *
 * `band` exists only in the side-band layout. A block assigned to it in
 * another layout is drawn in the header instead rather than disappearing:
 * somebody who changes layout should not silently lose a field.
 */
export const FIELD_SLOTS = [
  { key: "header", label: "Top of the page" },
  { key: "band", label: "In the side band" },
  { key: "footer", label: "Along the foot" },
] as const;

export type FieldSlot = (typeof FIELD_SLOTS)[number]["key"];

export function isFieldSlot(value: unknown): value is FieldSlot {
  return typeof value === "string" && FIELD_SLOTS.some((slot) => slot.key === value);
}

export interface LetterheadField {
  /** Stable across a reorder, which is what drag and drop needs. */
  id: string;
  source: FieldSource;
  /** Printed before the value when `showLabel` is on. */
  label: string;
  /** Read only when `source` is `custom`; everything else comes from Settings. */
  value: string;
  slot: FieldSlot;
  showLabel: boolean;
}

/** A short id that needs no library and cannot collide within one list. */
export function fieldId(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * The arrangement a letterhead starts with.
 *
 * Chosen rather than empty: a company that has just filled in Settings should
 * get a finished letterhead without arranging anything, and the six the Act
 * asks for should be on it from the first print.
 */
export function defaultFields(): LetterheadField[] {
  const make = (
    source: FieldSource,
    label: string,
    slot: FieldSlot,
    showLabel = false,
  ): LetterheadField => ({ id: fieldId(), source, label, value: "", slot, showLabel });

  return [
    make("phone", "Phone", "header"),
    make("email", "Email", "header"),
    make("website", "Web", "header"),

    make("legalName", "Registered name", "footer"),
    make("address", "Address", "footer"),
    make("cin", "CIN", "footer", true),
    make("gst", "GSTIN", "footer", true),
  ];
}

/**
 * Whatever is in the column, turned into a list that can be drawn.
 *
 * `jsonb` has no shape, so a half-edited row is possible and must not take the
 * screen down — the same rule `readTheme()` follows for a palette in the demos.
 * A row that is not an array, or is empty, gets the default arrangement: a
 * letterhead with no blocks on it is not a letterhead, and "nothing has been
 * configured" and "everything was deliberately removed" are not worth
 * distinguishing on a page that has to print.
 */
export function readFields(value: unknown): LetterheadField[] {
  if (!Array.isArray(value) || value.length === 0) return defaultFields();

  const fields = value
    .filter(
      (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object",
    )
    .map((entry) => {
      if (!isFieldSource(entry.source)) return null;

      return {
        id: typeof entry.id === "string" && entry.id !== "" ? entry.id : fieldId(),
        source: entry.source,
        label: typeof entry.label === "string" ? entry.label.slice(0, 60) : "",
        value: typeof entry.value === "string" ? entry.value.slice(0, 300) : "",
        slot: isFieldSlot(entry.slot) ? entry.slot : "footer",
        showLabel: entry.showLabel === true,
      } satisfies LetterheadField;
    })
    .filter((field): field is LetterheadField => field !== null);

  return fields.length > 0 ? fields : defaultFields();
}

/** One block, resolved to the text that will be printed. */
export interface ResolvedField {
  id: string;
  label: string;
  showLabel: boolean;
  /** One entry per line. An address is several; everything else is one. */
  lines: string[];
}

/** What a block's source holds, as lines. */
function linesFor(company: LetterheadCompany, field: LetterheadField): string[] {
  switch (field.source) {
    case "custom":
      return [field.value];
    case "address":
      return company.addressLines;
    case "socials":
      return company.socials.map((social) => social.value);
    case "legalName":
      return [company.legalName];
    case "tagline":
      return [company.tagline];
    case "phone":
      return [company.phone];
    case "whatsapp":
      return [company.whatsapp];
    case "email":
      return [company.email];
    case "website":
      return [company.website];
    case "workingHours":
      return [company.workingHours];
    case "cin":
      return [company.cin];
    case "gst":
      return [company.gst];
  }
}

/**
 * The blocks of one slot, in order, with the empty ones gone.
 *
 * **This is the rule the owner asked for**, and it lives in one function so it
 * cannot be half-applied: a block whose value is empty is not rendered at all.
 * Not blank, and not a label with nothing after it — absent, with the block
 * below it closing the gap.
 */
export function resolveFields(
  company: LetterheadCompany,
  fields: LetterheadField[],
  slot: FieldSlot,
  { hasBand = false }: { hasBand?: boolean } = {},
): ResolvedField[] {
  return fields
    .filter((field) => {
      if (field.slot === slot) return true;
      /* A band block with nowhere to go is drawn at the top instead. */
      return slot === "header" && field.slot === "band" && !hasBand;
    })
    .map((field) => ({
      id: field.id,
      label: field.label,
      showLabel: field.showLabel && field.label.trim() !== "",
      lines: linesFor(company, field)
        .map((line) => (line ?? "").trim())
        .filter((line) => line !== ""),
    }))
    .filter((resolved) => resolved.lines.length > 0);
}

/** A slot's blocks as one line, which is how the footer reads. */
export function joinFields(resolved: ResolvedField[], separator = " · "): string {
  return resolved
    .map((field) =>
      field.showLabel ? `${field.label}: ${field.lines.join(", ")}` : field.lines.join(", "),
    )
    .join(separator);
}

/**
 * Move one block to another position.
 *
 * Written here rather than in the component because it is the operation drag
 * and drop performs, the keyboard buttons perform, and the tests check — and a
 * reorder implemented three times is a reorder that behaves three ways.
 */
export function moveField(
  fields: LetterheadField[],
  id: string,
  toIndex: number,
): LetterheadField[] {
  const from = fields.findIndex((field) => field.id === id);
  if (from === -1) return fields;

  const next = [...fields];
  const [moved] = next.splice(from, 1);
  /* Clamped rather than trusted: a drop past the end of the list gives an
     index one beyond it, and a negative one comes from dragging upward off
     the top. Both are gestures, not errors. */
  const target = Math.max(0, Math.min(toIndex, next.length));
  next.splice(target, 0, moved);

  return next;
}
