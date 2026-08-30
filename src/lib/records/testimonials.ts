import type { MediaOption } from "@/lib/media/image-fields";
import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { imageField } from "@/lib/sections/fields";
import { CONTENT_STATUS_OPTIONS } from "@/lib/validation/records";
import type { Tables, TablesUpdate } from "@/types/database";

export type TestimonialRow = Tables<"testimonials">;

/** A portfolio entry, as the "what it is about" list needs it. */
export interface ProjectOption {
  id: string;
  label: string;
}

/**
 * A testimonial, as the admin edits it.
 *
 * This screen was missing until 2026-08-28. The table existed, the public case
 * study page rendered a quote from it, and the case study editor offered a
 * dropdown to choose one — but nothing anywhere inserted a row, so the dropdown
 * was permanently empty and the block on the page could never appear. A feature
 * that is read in three places and written in none is not a feature.
 *
 * The shape of this form is dictated by one line in the schema:
 *
 *     constraint testimonials_require_consent check (
 *       status <> 'published' or consent_confirmed
 *     )
 *
 * **A quote is a real person's words, published under their name.** The table
 * refuses to publish one until somebody has recorded that they said it and
 * agreed to its use, and that refusal is the whole point of the table — its own
 * comment reads "Real testimonials only". So consent is not a checkbox tucked
 * under an advanced section here; it is its own step with its own explanation,
 * and the schema below turns the constraint into a sentence beside the box
 * rather than letting the database raise an error nobody can read.
 */
export function testimonialFieldsets(
  assets: MediaOption[],
  projects: ProjectOption[],
): Fieldset[] {
  return [
    {
      legend: "Who said it",
      hint: "Their name is printed under the quote, so write it the way they would want to be credited.",
      fields: [
        {
          kind: "text",
          name: "author_name",
          label: "Name",
          required: true,
          max: 160,
          hint: "The person, not the company. A quote attributed to an organisation reads as marketing copy, because that is usually what it is.",
        },
        {
          kind: "text",
          name: "author_role",
          label: "Their role",
          max: 160,
          hint: "What they do at that company — it is what tells a reader whether this person was in a position to judge the work.",
        },
        {
          kind: "text",
          name: "company_name",
          label: "Company",
          max: 160,
        },
      ],
    },
    {
      legend: "What they said",
      fields: [
        {
          kind: "textarea",
          name: "quote",
          label: "The quote",
          required: true,
          max: 1200,
          rows: 6,
          hint: "Their words, not a tidied-up version of them. Trim to length if you must, but do not rewrite — a quote that has been improved is no longer a quote.",
        },
        {
          kind: "number",
          name: "rating",
          label: "Rating out of 5",
          min: 1,
          max: 5,
          hint: "Optional, and only if they actually gave one. Left empty, no stars are drawn.",
        },
      ],
    },
    {
      legend: "Photo",
      hint: "Optional. The quote renders without one; a missing photograph is not a broken card.",
      fields: [imageField("avatar_id", "testimonial.avatar", assets)],
    },
    {
      legend: "What it is about",
      hint: "Optional. Linking the quote to the work it is about is what lets it appear beside that work rather than only in a list.",
      fields: [
        {
          kind: "select",
          name: "project_id",
          label: "Portfolio entry",
          options: projects.map((project) => ({ value: project.id, label: project.label })),
        },
      ],
    },
    {
      legend: "Consent",
      hint: "The table will not publish a quote without this. That is deliberate: publishing somebody's words under their name and their employer's name is a thing you need their agreement for, and the agreement has to be recorded somewhere a year from now.",
      fields: [
        {
          kind: "boolean",
          name: "consent_confirmed",
          label: "They said this, and they are happy for it to be published",
          hint: "Tick it only if that is true of the person named above.",
        },
        {
          kind: "text",
          name: "consent_note",
          label: "How it was given",
          max: 500,
          hint: 'Where the agreement lives — "email, 12 Aug 2026", "WhatsApp, confirmed by Priya". A year from now this is the only thing that can answer the question.',
        },
      ],
    },
    {
      legend: "Publication",
      hint: "The order quotes appear in is set with the arrows on the list, not here.",
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
        },
      ],
    },
  ];
}

/**
 * The schema for one testimonial, with the consent rule attached.
 *
 * The rule mirrors `testimonials_require_consent` in the schema, for the same
 * reason the pricing screen mirrors its check constraint: the database is the
 * one that must be right, and the form is the one that has to explain itself.
 * Without this, ticking Published on a quote with no recorded consent comes
 * back as a Postgres constraint violation — accurate, and unreadable.
 */
export function testimonialSchema(assets: MediaOption[], projects: ProjectOption[]) {
  return recordSchema(testimonialFieldsets(assets, projects)).superRefine((values, ctx) => {
    const record = values as Record<string, unknown>;

    if (record.status !== "published") return;
    if (record.consent_confirmed === true) return;

    ctx.addIssue({
      code: "custom",
      path: ["consent_confirmed"],
      message:
        "A quote cannot be published until you have confirmed the person said it and agreed to it being used.",
    });
  });
}

/** The row, as the form's values. */
export function testimonialToValues(row: TestimonialRow): Record<string, unknown> {
  return {
    author_name: row.author_name,
    author_role: row.author_role ?? "",
    company_name: row.company_name ?? "",
    quote: row.quote,
    rating: row.rating ?? undefined,
    avatar_id: row.avatar_id ?? "",
    project_id: row.project_id ?? "",
    consent_confirmed: row.consent_confirmed,
    consent_note: row.consent_note ?? "",
    status: row.status,
  };
}

/** The validated values, as columns. */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"testimonials"> {
  return {
    author_name: text(values.author_name) ?? "",
    author_role: text(values.author_role),
    company_name: text(values.company_name),
    quote: text(values.quote) ?? "",

    // A cleared rating is "they did not give one", which is not zero stars.
    rating: typeof values.rating === "number" ? values.rating : null,

    avatar_id: text(values.avatar_id),
    project_id: text(values.project_id),
    consent_confirmed: values.consent_confirmed === true,
    consent_note: text(values.consent_note),
    status: values.status as TestimonialRow["status"],
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
