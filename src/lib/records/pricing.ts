import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import { CONTENT_STATUS_OPTIONS, SLUG_PATTERN } from "@/lib/validation/records";
import type { Json, Tables, TablesUpdate } from "@/types/database";

export type PricingPlanRow = Tables<"pricing_plans">;

/**
 * The currencies a plan may be priced in.
 *
 * A short list rather than every ISO code, because the card prints a symbol for
 * one of them and the code for the rest — offering 180 currencies would be
 * offering 179 that render as "AWG 40,000".
 */
export const CURRENCY_OPTIONS = [
  { value: "INR", label: "Indian rupee (₹)" },
  { value: "USD", label: "US dollar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
  { value: "GBP", label: "Pound sterling (GBP)" },
  { value: "AED", label: "UAE dirham (AED)" },
] as const;

/**
 * Where a plan's button may point.
 *
 * Stated as a rule rather than left free text: `cta_href` is rendered straight
 * into an `href`, and the one shape that must never reach it is a bare word
 * that silently resolves against whatever page the card happens to be on.
 */
const HREF_PATTERN = {
  re: /^(?:\/|https?:\/\/|mailto:|tel:)/,
  message:
    "Start with / for a page on this site, or with https://, mailto: or tel: for anywhere else.",
} as const;

/**
 * A pricing plan, as the admin edits it.
 *
 * Every descriptor is named after the column it writes, so the mappings below
 * are rename-free and there is no second place where a field's identity is
 * decided.
 *
 * The price is the most consequential thing anyone types into this panel, so
 * the fields around it are described by what they do to the card rather than by
 * what they are: the custom-quote switch is named for what it prints.
 */
export function pricingFieldsets(): Fieldset[] {
  return [
    {
      legend: "Identity",
      fields: [
        {
          kind: "text",
          name: "name",
          label: "Plan name",
          required: true,
          max: 120,
          hint: "What a client would call it — “Starter”, “Growth”, “Enterprise”.",
        },
        {
          kind: "text",
          name: "slug",
          label: "Reference",
          required: true,
          max: 120,
          pattern: SLUG_PATTERN,
          hint: "Not shown anywhere. It identifies the plan, so renaming one never breaks anything pointing at it.",
        },
        {
          kind: "text",
          name: "tagline",
          label: "One line under the name",
          max: 200,
          hint: "Who the plan is for, in a breath.",
        },
      ],
    },
    {
      legend: "Price",
      hint: "A published plan must either name a starting figure or say that the price depends on the brief. The database refuses anything else, and so does this form.",
      fields: [
        {
          kind: "boolean",
          name: "is_custom_quote",
          label: "The price depends on the brief",
          hint: "The card prints “Custom quote” and the figure below is ignored.",
        },
        {
          kind: "number",
          name: "price_from",
          label: "Starting price",
          min: 0,
          hint: "The floor, not an estimate. The card prints it as “From …”.",
        },
        {
          kind: "select",
          name: "currency",
          label: "Currency",
          required: true,
          options: [...CURRENCY_OPTIONS],
        },
        {
          kind: "text",
          name: "price_note",
          label: "Note under the price",
          max: 200,
          hint: "Where the exclusions go — “plus GST”, “per month, billed yearly”.",
        },
      ],
    },
    {
      legend: "What it includes",
      hint: "One line each, in the order they should be read. The ticks are drawn for you.",
      fields: [
        {
          kind: "list",
          name: "features",
          label: "Included",
          itemLabel: "line",
        },
      ],
    },
    {
      legend: "The button",
      fields: [
        {
          kind: "text",
          name: "cta_label",
          label: "Button text",
          required: true,
          max: 60,
        },
        {
          kind: "text",
          name: "cta_href",
          label: "Button goes to",
          required: true,
          max: 500,
          pattern: HREF_PATTERN,
        },
      ],
    },
    {
      legend: "Publication",
      hint: "The order the cards appear in is set with the arrows on the list, not here.",
      fields: [
        {
          kind: "boolean",
          name: "is_highlighted",
          label: "Mark this one as most asked for",
          hint: "Draws the accent border and the badge. Only one plan should carry it — two make neither stand out.",
        },
        {
          kind: "select",
          name: "status",
          label: "Status",
          required: true,
          options: [...CONTENT_STATUS_OPTIONS],
          hint: "Only published plans appear on the pricing page.",
        },
      ],
    },
  ];
}

/**
 * The schema for a plan.
 *
 * The one cross-field rule restates the table's `pricing_plans_price_present`
 * check constraint, so publishing a plan with neither a figure nor the switch
 * comes back as a sentence beside the price rather than as a constraint
 * violation nobody can read.
 */
export function pricingSchema() {
  return recordSchema(pricingFieldsets()).superRefine((values, ctx) => {
    const record = values as Record<string, unknown>;

    if (record.status !== "published") return;
    if (record.is_custom_quote === true) return;
    if (typeof record.price_from === "number") return;

    ctx.addIssue({
      code: "custom",
      path: ["price_from"],
      message:
        "A published plan needs a starting price, or the switch above that says the price depends on the brief.",
    });
  });
}

/** The row, as the form's values. */
export function planToValues(row: PricingPlanRow): Record<string, unknown> {
  return {
    name: row.name,
    slug: row.slug,
    tagline: row.tagline ?? "",

    is_custom_quote: row.is_custom_quote,
    // `undefined` is what an empty number input reads as, so a cleared price
    // round-trips to NULL rather than to zero — which on a price card is the
    // difference between "ask us" and "free".
    price_from: row.price_from === null ? undefined : Number(row.price_from),
    currency: row.currency,
    price_note: row.price_note ?? "",

    features: stringList(row.features),

    cta_label: row.cta_label,
    cta_href: row.cta_href,

    is_highlighted: row.is_highlighted,
    status: row.status,
  };
}

/** The validated values, as columns. */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"pricing_plans"> {
  return {
    name: text(values.name) ?? "",
    slug: text(values.slug) ?? "",
    tagline: text(values.tagline),

    is_custom_quote: values.is_custom_quote === true,
    price_from: typeof values.price_from === "number" ? values.price_from : null,
    currency: text(values.currency) ?? "INR",
    price_note: text(values.price_note),

    features: asJson(list(values.features)),

    cta_label: text(values.cta_label) ?? "Request a Quote",
    cta_href: text(values.cta_href) ?? "/request-a-quote",

    is_highlighted: values.is_highlighted === true,
    status: values.status as PricingPlanRow["status"],
  };
}

/**
 * A validated value, as the column's type.
 *
 * The generated `Json` type is a recursive union that TypeScript cannot see a
 * plain array as a member of, even when every value inside it is one. The cast
 * is safe because of where it is applied: to a value already parsed field by
 * field and narrowed again by `list` below.
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
