import type { Fieldset } from "@/lib/records/definition";
import { recordSchema } from "@/lib/records/definition";
import type { Tables, TablesUpdate } from "@/types/database";

export type FaqRow = Tables<"faqs">;

/**
 * The pages that are not services.
 *
 * `faqs.scope` is a free text array by design — it holds a page name or a
 * service slug — so this list is the fixed half of what the admin offers.
 * The service slugs are read from the database and merged with it in
 * `faqScopeOptions()`.
 */
export const PAGE_SCOPES = [
  { value: "home", label: "Home page" },
  { value: "pricing", label: "Pricing page" },
  { value: "contact", label: "Contact page" },
] as const;

/**
 * A question and its answer, as the admin edits it.
 *
 * The smallest record on the panel — four fields — and the one whose wording
 * matters most, because an FAQ is the only place on the site where a visitor's
 * actual objection gets answered in their own words. The hints say so.
 *
 * `sort_order` is absent, deliberately: the order is set with the arrows on the
 * list, where it can be seen, rather than by typing a number into a form.
 */
export function faqFieldsets(
  scopes: { value: string; label: string }[],
): Fieldset[] {
  return [
    {
      legend: "The question",
      fields: [
        {
          kind: "textarea",
          name: "question",
          label: "Question",
          required: true,
          max: 300,
          rows: 2,
          hint: "In the words someone would actually use, not the words we would prefer they used.",
        },
        {
          kind: "textarea",
          name: "answer",
          label: "Answer",
          required: true,
          max: 2000,
          rows: 8,
          hint: "Answer it honestly and then stop. A question answered with a sales line is a question that gets asked again on the phone.",
        },
      ],
    },
    {
      legend: "Where it appears",
      hint: "One question can serve several pages. That is the point of this list — one honest answer about code ownership belongs on the home page, the pricing page and the service page, and three copies of it would drift apart.",
      fields: [
        {
          kind: "checkboxes",
          name: "scope",
          label: "Pages",
          options: scopes,
          hint: "Tick none and the question is stored but appears nowhere.",
        },
      ],
    },
    {
      legend: "Publication",
      hint: "The order the questions are asked in is set with the arrows on the list, not here.",
      fields: [
        {
          kind: "boolean",
          name: "is_active",
          label: "Show this question on the site",
          hint: "Untick it to take the question down without losing the answer.",
        },
      ],
    },
  ];
}

/** The schema for one FAQ. No cross-field rules — the table has none either. */
export function faqSchema(scopes: { value: string; label: string }[]) {
  return recordSchema(faqFieldsets(scopes));
}

/** The row, as the form's values. */
export function faqToValues(row: FaqRow): Record<string, unknown> {
  return {
    question: row.question,
    answer: row.answer,
    scope: row.scope ?? [],
    is_active: row.is_active,
  };
}

/** The validated values, as columns. */
export function valuesToRow(values: Record<string, unknown>): TablesUpdate<"faqs"> {
  return {
    question: text(values.question) ?? "",
    answer: text(values.answer) ?? "",
    scope: list(values.scope),
    is_active: values.is_active === true,
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
