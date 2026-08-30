import { galleryToJson, readGallery } from "@/lib/media/gallery";
import type { MediaOption } from "@/lib/media/image-fields";
import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { imageField } from "@/lib/sections/fields";
import { CONTENT_STATUS_OPTIONS, SLUG_PATTERN } from "@/lib/validation/records";
import type { Json, Tables, TablesUpdate } from "@/types/database";

export type CaseStudyRow = Tables<"case_studies">;

export interface PickerOption {
  id: string;
  label: string;
}

/**
 * A case study, as the admin edits it.
 *
 * Every descriptor is named after the column it writes, so the mapping below is
 * a rename-free copy and there is no second place where a field's identity is
 * decided.
 *
 * `screenshots` is a repeater of image fields — the one column on this table
 * that holds a list of pictures rather than one. It is the same descriptor the
 * portfolio gallery uses, against a different declared size, and it produces
 * the same `{ media_id, caption }` row the column already stored.
 */
export function caseStudyFieldsets(
  technologies: PickerOption[],
  projects: PickerOption[],
  testimonials: PickerOption[],
  assets: MediaOption[],
): Fieldset[] {
  return [
    {
      legend: "Identity",
      fields: [
        {
          kind: "text",
          name: "title",
          label: "Title",
          required: true,
          max: 200,
          hint: "What the work achieved, not what it was called internally.",
        },
        {
          kind: "text",
          name: "slug",
          label: "Address",
          required: true,
          max: 120,
          pattern: SLUG_PATTERN,
          hint: "The last part of the web address: /case-studies/…",
        },
        {
          kind: "text",
          name: "client_name",
          label: "Client",
          max: 160,
          hint: "Only with their agreement. Leave empty to write it up anonymously.",
        },
        { kind: "text", name: "industry", label: "Industry", max: 80 },
        {
          kind: "text",
          name: "duration",
          label: "Duration",
          max: 80,
          hint: "How long it took, in plain words — “six weeks”, “three months”.",
        },
      ],
    },
    {
      legend: "The story",
      hint: "Both render as their own block, and either can be left empty.",
      fields: [
        { kind: "textarea", name: "problem", label: "What needed solving", max: 2000 },
        { kind: "textarea", name: "solution", label: "What we did", max: 2000 },
        {
          kind: "list",
          name: "features",
          label: "Built into it",
          hint: "The parts of the solution worth naming.",
        },
      ],
    },
    {
      legend: "Outcome",
      hint: "Optional, and meant to be. A case study with no measured result is still worth publishing; a case study with an invented one is worth less than nothing.",
      fields: [
        {
          kind: "repeater",
          name: "results",
          label: "Measured results",
          itemLabel: "result",
          max: 6,
          hint: "Only figures you can stand behind if asked where they came from.",
          fields: [
            {
              kind: "text",
              name: "label",
              label: "What was measured",
              required: true,
              max: 80,
              hint: "“Time to quote”, “Support tickets”.",
            },
            {
              kind: "text",
              name: "value",
              label: "The result",
              required: true,
              max: 60,
              hint: "Written however it reads best — “−40%”, “two weeks”, “from 4 staff to 1”.",
            },
            { kind: "text", name: "note", label: "Note", max: 200 },
          ],
        },
      ],
    },
    {
      legend: "Header image",
      hint: "Optional. The write-up reads perfectly well without one, and a placeholder photograph of nothing in particular reads worse than no photograph.",
      fields: [imageField("og_image_id", "caseStudy.header", assets)],
    },
    {
      legend: "Screenshots",
      hint: "The “A look inside” grid, two screens to a row, in the order set here. Leave it empty and the whole section is left out of the write-up rather than shown as an empty grid. A screen whose file is later deleted from the library drops out on its own.",
      fields: [
        {
          kind: "repeater",
          name: "screenshots",
          label: "Screens",
          itemLabel: "screen",
          max: 12,
          fields: [
            // Required, because a row with a caption and no picture is a row
            // the page cannot draw — and the page's own reader would drop it,
            // leaving a caption that was saved and never appeared.
            imageField("media_id", "caseStudy.screenshot", assets, { required: true }),
            {
              kind: "text",
              name: "caption",
              label: "Caption",
              max: 200,
              hint: "Optional. One line under the screen — what it does, not what it looks like.",
            },
          ],
        },
      ],
    },
    {
      legend: "Connections",
      fields: [
        {
          kind: "select",
          name: "project_id",
          label: "Portfolio entry",
          options: projects.map((project) => ({ value: project.id, label: project.label })),
          hint: "Links the study to the work itself. The link only appears once that entry is published.",
        },
        {
          kind: "select",
          name: "testimonial_id",
          label: "Testimonial",
          options: testimonials.map((entry) => ({ value: entry.id, label: entry.label })),
          hint: "Only quotes with recorded consent are listed here.",
        },
        {
          kind: "checkboxes",
          name: "technology_ids",
          label: "Technologies",
          options: technologies.map((tech) => ({ value: tech.id, label: tech.label })),
          hint: "Shown as the stack behind it. Tick none and the block is left out.",
        },
      ],
    },
    {
      legend: "Publication",
      hint: "Case studies are ordered by their publication date, newest first — there is no manual position to set.",
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
          hint: "Only published studies appear on the site and in the sitemap.",
        },
      ],
    },
    {
      legend: "Search engines",
      hint: "All optional. Left empty, the title and the problem are used.",
      fields: [
        { kind: "text", name: "seo_title", label: "Title tag", max: 160 },
        { kind: "textarea", name: "seo_description", label: "Meta description", max: 400 },
        {
          kind: "list",
          name: "seo_keywords",
          label: "Keywords",
          hint: "Rarely worth filling in — no major search engine has used this tag for ranking in years.",
        },
        { kind: "text", name: "canonical_url", label: "Canonical URL", max: 500 },
        {
          kind: "boolean",
          name: "noindex",
          label: "Ask search engines not to index this page",
          hint: "The page stays reachable by anyone who has the link.",
        },
      ],
    },
  ];
}

/**
 * The schema for a case study.
 *
 * No cross-field rules to restate: this table carries no check constraints
 * beyond the slug pattern, deliberately, because everything about it is
 * optional by design. What keeps it honest is the `results` column being
 * nullable and the testimonial having to carry consent — neither of which is
 * something a form can enforce more strictly than the database already does.
 */
export function caseStudySchema(
  technologies: PickerOption[],
  projects: PickerOption[],
  testimonials: PickerOption[],
  assets: MediaOption[],
) {
  return recordSchema(caseStudyFieldsets(technologies, projects, testimonials, assets));
}

/** The row, as the form's values. */
export function caseStudyToValues(row: CaseStudyRow): Record<string, unknown> {
  return {
    title: row.title,
    slug: row.slug,
    client_name: row.client_name ?? "",
    industry: row.industry ?? "",
    duration: row.duration ?? "",

    problem: row.problem ?? "",
    solution: row.solution ?? "",
    features: stringList(row.features),

    results: readResults(row.results),

    og_image_id: row.og_image_id ?? "",

    // Read through the same function the public page reads it with, so the
    // form shows exactly the rows that would render.
    screenshots: readGallery(row.screenshots).map((item) => ({
      media_id: item.media_id,
      caption: item.caption ?? "",
    })),

    project_id: row.project_id ?? "",
    testimonial_id: row.testimonial_id ?? "",
    technology_ids: row.technology_ids,

    status: row.status,

    seo_title: row.seo_title ?? "",
    seo_description: row.seo_description ?? "",
    seo_keywords: row.seo_keywords,
    canonical_url: row.canonical_url ?? "",
    noindex: row.noindex,
  };
}

/**
 * The validated values, as columns.
 *
 * `results` becomes SQL `NULL` when nothing was entered rather than an empty
 * array. The column's own comment says never to populate it with invented
 * figures, and null is the honest way to say "not measured" — an empty array
 * reads as "measured, and the answer was nothing".
 */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"case_studies"> {
  const results = (Array.isArray(values.results) ? values.results : []).flatMap((entry) => {
    const row = (entry ?? {}) as Record<string, unknown>;
    const label = text(row.label);
    const value = text(row.value);
    if (!label || !value) return [];
    return [{ label, value, note: text(row.note) }];
  });

  return {
    title: text(values.title) ?? "",
    slug: text(values.slug) ?? "",
    client_name: text(values.client_name),
    industry: text(values.industry),
    duration: text(values.duration),

    og_image_id: text(values.og_image_id),
    screenshots: galleryToJson(values.screenshots),

    problem: text(values.problem),
    solution: text(values.solution),
    features: asJson(list(values.features)),

    results: results.length > 0 ? asJson(results) : null,

    project_id: text(values.project_id),
    testimonial_id: text(values.testimonial_id),
    technology_ids: list(values.technology_ids),

    status: values.status as CaseStudyRow["status"],

    seo_title: text(values.seo_title),
    seo_description: text(values.seo_description),
    seo_keywords: list(values.seo_keywords),
    canonical_url: text(values.canonical_url),
    noindex: values.noindex === true,
  };
}

/**
 * A validated value, as the column's type.
 *
 * The generated `Json` type is a recursive union that TypeScript cannot see a
 * plain array or object as a member of, even when every value inside it is one.
 * The cast is safe because of where it is applied: to values already parsed
 * field by field and narrowed again by the helpers below.
 */
function asJson(value: unknown): Json {
  return value as Json;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

function readResults(value: unknown): { label: string; value: string; note: string }[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.label !== "string" || typeof row.value !== "string") return [];
    return [
      {
        label: row.label,
        value: row.value,
        note: typeof row.note === "string" ? row.note : "",
      },
    ];
  });
}
