import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import type { Tables, TablesUpdate } from "@/types/database";

export type MediaRow = Tables<"media">;

/**
 * A folder name, as the column will hold it.
 *
 * Lowercase, hyphenated, one segment. `media.folder` is free text with a
 * default, so nothing stops "Brand", "brand " and "brand" becoming three
 * folders that look like one — which is how a library of two hundred files
 * stops being navigable.
 */
const FOLDER_PATTERN = {
  re: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  message: "Lowercase letters, numbers and single hyphens — one word, no slashes.",
} as const;

/**
 * An asset's details, as the admin edits them.
 *
 * The file itself is not here. Nothing on this form can change the bytes: a
 * replacement is an upload, which gets its own row and its own address, and the
 * old one stays reachable for anything still pointing at it. That is the whole
 * reason the serving route can cache for a year.
 *
 * `width`, `height`, `size_bytes` and `mime_type` are not here either. They are
 * read from the file's own header at upload and are facts about it, not
 * opinions — a form that let someone type "1200 × 800" over a 400 × 300 file
 * would break the one rule this library exists to keep.
 */
export function mediaFieldsets(
  darkVariants: { id: string; label: string }[],
): Fieldset[] {
  return [
    {
      legend: "Describing it",
      hint: "Alt text is required by the database, deliberately. It is trivial to write at the moment of upload and expensive to retrofit across a site later — and without it the image is invisible to a screen reader and to search.",
      fields: [
        {
          kind: "textarea",
          name: "alt_text",
          label: "Alt text",
          required: true,
          max: 300,
          rows: 2,
          hint: "What the image shows, to someone who cannot see it. Not “photo of” — just the thing itself. It cannot be left blank; the database refuses an empty one.",
        },
        {
          kind: "text",
          name: "caption",
          label: "Caption",
          max: 300,
          hint: "Optional, and shown on the page where the design has a place for one.",
        },
        {
          kind: "text",
          name: "attribution",
          label: "Credit",
          max: 300,
          hint: "Where a licence requires the photographer or the source to be named. Company imagery is our own, so this stays empty for it.",
        },
      ],
    },
    {
      legend: "Filing",
      fields: [
        {
          kind: "text",
          name: "filename",
          label: "Filename",
          required: true,
          max: 200,
          hint: "What it is called in the library and in its web address. Renaming it is safe — the address resolves on the id in front of the name.",
        },
        {
          kind: "text",
          name: "folder",
          label: "Folder",
          required: true,
          max: 60,
          pattern: FOLDER_PATTERN,
          hint: "A folder exists as soon as something is filed in it. “brand”, “services”, “team”.",
        },
      ],
    },
    {
      legend: "Dark theme",
      hint: "Only where one file genuinely cannot serve both themes — a logo, a diagram with dark strokes. A photograph needs no counterpart.",
      fields: [
        {
          kind: "select",
          name: "dark_variant_id",
          label: "Dark counterpart",
          options: darkVariants.map((entry) => ({ value: entry.id, label: entry.label })),
          hint: "Both files are emitted and CSS hides one, so the right mark is painted in the first frame rather than after a script runs.",
        },
      ],
    },
  ];
}

export function mediaSchema(darkVariants: { id: string; label: string }[]) {
  return recordSchema(mediaFieldsets(darkVariants));
}

/** The row, as the form's values. */
export function mediaToValues(row: MediaRow): Record<string, unknown> {
  return {
    alt_text: row.alt_text,
    caption: row.caption ?? "",
    attribution: row.attribution ?? "",
    filename: row.filename,
    folder: row.folder,
    dark_variant_id: row.dark_variant_id ?? "",
  };
}

/**
 * The validated values, as columns.
 *
 * `public_url` is rewritten alongside the filename, because the address carries
 * the name for the benefit of anyone reading the link. Only the id in front of
 * it resolves, so a rename is cosmetic and nothing that already points at the
 * asset breaks.
 */
export function valuesToRow(
  id: string,
  values: Record<string, unknown>,
): TablesUpdate<"media"> {
  const filename = text(values.filename) ?? "";

  return {
    alt_text: text(values.alt_text) ?? "",
    caption: text(values.caption),
    attribution: text(values.attribution),
    filename,
    folder: text(values.folder) ?? "general",
    dark_variant_id: text(values.dark_variant_id),
    public_url: mediaPath(id, filename),
  };
}

/**
 * The address a stored asset is served at.
 *
 * One function, used by the upload and by every rename, so the shape of a
 * media URL is decided in exactly one place. The route at `/media/[...slug]`
 * is the other half of it.
 */
export function mediaPath(id: string, filename: string): string {
  return `/media/${id}/${encodeURIComponent(filename)}`;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
