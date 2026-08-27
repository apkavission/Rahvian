import { z } from "zod";
import type { MediaOption } from "@/lib/media/image-fields";
import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { imageField } from "@/lib/sections/fields";
import { CONTENT_STATUS_OPTIONS, SLUG_PATTERN } from "@/lib/validation/records";
import { ICON_NAMES } from "@/components/ui/icon";
import type { Tables, TablesUpdate } from "@/types/database";

export type ServiceRow = Tables<"services">;

/**
 * A service, as the admin edits it.
 *
 * Every descriptor is named after the column it writes, so the mapping below is
 * a rename-free copy and there is no second place where a field's identity is
 * decided. The three JSONB columns are `list` fields — they hold arrays of
 * short strings and always have; describing them as anything richer would be
 * describing a shape the public page does not read.
 *
 * `body` is deliberately absent. The column exists for long-form blocks and
 * nothing renders it yet; a form that writes a column no page reads teaches the
 * owner that their work is being ignored.
 *
 * The technology list is passed in rather than imported because it is rows in a
 * table. The Server Action builds the same options from the same query before
 * it validates, so a posted id that is not a technology is refused.
 */
export function serviceFieldsets(
  technologies: { id: string; name: string }[],
  assets: MediaOption[],
): Fieldset[] {
  return [
    {
      legend: "Identity",
      hint: "What this service is called, and where it lives.",
      fields: [
        {
          kind: "text",
          name: "name",
          label: "Name",
          required: true,
          max: 120,
          hint: "The full name, as it appears as the page heading.",
        },
        {
          kind: "text",
          name: "slug",
          label: "Address",
          required: true,
          max: 120,
          pattern: SLUG_PATTERN,
          hint: "The last part of the web address: /services/…",
        },
        {
          kind: "text",
          name: "short_name",
          label: "Short name",
          max: 60,
          hint: "Used in the navigation and breadcrumbs where the full name is too long.",
        },
        {
          kind: "select",
          name: "icon",
          label: "Icon",
          options: ICON_NAMES.map((name) => ({ value: name, label: iconLabel(name) })),
          hint: "Shown on the service card and beside the page heading.",
        },
        {
          kind: "textarea",
          name: "summary",
          label: "Summary",
          required: true,
          max: 400,
          hint: "One or two sentences. This is the card on the services grid, and the description search engines fall back to.",
        },
      ],
    },
    {
      legend: "The page",
      hint: "Left empty, the heading falls back to the name and the opening line to the summary.",
      fields: [
        { kind: "text", name: "hero_heading", label: "Page heading", max: 160 },
        { kind: "textarea", name: "hero_subheading", label: "Opening line", max: 400 },
      ],
    },
    {
      legend: "What it covers",
      hint: "Each list becomes a block on the page. An empty list leaves its block out rather than rendering an empty one.",
      fields: [
        {
          kind: "list",
          name: "included_items",
          label: "What is included",
          hint: "Everything in scope. Anything not listed is quoted separately.",
        },
        {
          kind: "list",
          name: "audience",
          label: "Who it is for",
          hint: "Each line finishes the sentence “This is the right fit if…”.",
        },
        {
          kind: "list",
          name: "approach",
          label: "How we deliver",
          hint: "What we do differently on this kind of work.",
        },
      ],
    },
    {
      legend: "Built with",
      fields: [
        {
          kind: "checkboxes",
          name: "technology_ids",
          label: "Technologies",
          options: technologies.map((tech) => ({ value: tech.id, label: tech.name })),
          hint: "Shown as the stack behind this service. Tick none and the block is left out.",
        },
      ],
    },
    {
      legend: "Pricing",
      hint: "A published service needs one of these — a starting price, or the priced-per-project switch. The database refuses to publish one with neither.",
      fields: [
        {
          kind: "boolean",
          name: "is_custom_quote",
          label: "Priced per project",
          hint: "The page says it is quoted after scoping, and any starting price is left out.",
        },
        {
          kind: "number",
          name: "price_from",
          label: "Starting price",
          min: 0,
          hint: "In rupees, without the symbol or the separators.",
        },
        {
          kind: "text",
          name: "price_note",
          label: "Price note",
          max: 160,
          hint: "The small line under the price — what it includes, or what moves it.",
        },
      ],
    },
    {
      legend: "Publication",
      fields: [
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
          hint: "Only published services appear on the site, in the navigation and in the sitemap.",
        },
        {
          kind: "number",
          name: "sort_order",
          label: "Position",
          required: true,
          min: 0,
          hint: "Lower comes first. The arrows in the list are the easier way to change it.",
        },
      ],
    },
    {
      legend: "Search engines",
      hint: "All optional. Left empty, the name and the summary are used.",
      fields: [
        imageField("og_image_id", "service.social", assets),
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
 * The schema for a service, plus the one rule no single field can express.
 *
 * `services_pricing_present` is a check constraint, so the database refuses a
 * published service that has neither a price nor the custom-quote switch.
 * Stated again here so the refusal arrives as a sentence under the field that
 * fixes it, rather than as a Postgres error string.
 */
export function serviceSchema(
  technologies: { id: string; name: string }[],
  assets: MediaOption[],
) {
  return recordSchema(serviceFieldsets(technologies, assets)).superRefine((values, ctx) => {
    const record = values as Record<string, unknown>;

    if (record.status !== "published") return;
    if (record.is_custom_quote === true) return;
    if (typeof record.price_from === "number") return;

    ctx.addIssue({
      code: "custom",
      path: ["price_from"],
      message:
        "A published service needs a starting price, or the priced-per-project switch above.",
    });
  });
}

export type ServiceValues = z.infer<ReturnType<typeof serviceSchema>>;

/** The row, as the form's values. */
export function serviceToValues(row: ServiceRow): Record<string, unknown> {
  return {
    name: row.name,
    slug: row.slug,
    short_name: row.short_name ?? "",
    icon: row.icon ?? "",
    og_image_id: row.og_image_id ?? "",
    summary: row.summary,

    hero_heading: row.hero_heading ?? "",
    hero_subheading: row.hero_subheading ?? "",

    included_items: stringList(row.included_items),
    audience: stringList(row.audience),
    approach: stringList(row.approach),

    technology_ids: row.technology_ids,

    is_custom_quote: row.is_custom_quote,
    // `numeric` reaches JavaScript as a number through PostgREST and as a
    // string through some clients. Normalising here means the number input is
    // never handed a string, which it would render as empty.
    price_from: row.price_from === null ? undefined : Number(row.price_from),
    price_note: row.price_note ?? "",

    status: row.status,
    sort_order: row.sort_order,

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
 * Every optional text field becomes `null` rather than `""`. An empty string in
 * a nullable column is a value that looks absent and is not: the page's
 * `?? fallback` never fires, and the heading renders as nothing at all.
 */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"services"> {
  return {
    name: text(values.name) ?? "",
    slug: text(values.slug) ?? "",
    short_name: text(values.short_name),
    icon: text(values.icon),
    og_image_id: text(values.og_image_id),
    summary: text(values.summary) ?? "",

    hero_heading: text(values.hero_heading),
    hero_subheading: text(values.hero_subheading),

    included_items: list(values.included_items),
    audience: list(values.audience),
    approach: list(values.approach),

    technology_ids: list(values.technology_ids),

    is_custom_quote: values.is_custom_quote === true,
    price_from: typeof values.price_from === "number" ? values.price_from : null,
    price_note: text(values.price_note),

    status: values.status as ServiceRow["status"],
    sort_order: typeof values.sort_order === "number" ? values.sort_order : 0,

    seo_title: text(values.seo_title),
    seo_description: text(values.seo_description),
    seo_keywords: list(values.seo_keywords),
    canonical_url: text(values.canonical_url),
    noindex: values.noindex === true,
  };
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function list(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

/**
 * JSONB columns are `Json`, which is legitimately anything. These three are
 * written as arrays of strings; anything else is dropped rather than shown, so
 * a row edited by hand degrades to a missing entry instead of a broken form.
 */
function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

/** "layout-dashboard", shown as "Layout dashboard". */
function iconLabel(name: string): string {
  const words = name.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
