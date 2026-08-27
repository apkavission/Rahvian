import "server-only";

import type { EmailTemplate } from "@/lib/queries/email-templates";

/**
 * `{{placeholder}}` substitution for admin-editable email copy.
 *
 * Values are substituted raw, before the renderer escapes anything. Doing it
 * the other way round would double-escape a client's company name, and every
 * string here reaches the HTML through `escapeHtml` in the layout regardless.
 *
 * An unknown placeholder is left standing rather than replaced with an empty
 * string. `Hi {{frist_name}},` in a test send is a typo someone fixes; `Hi ,`
 * looks like a bug in the software and gets reported as one.
 */

export type Placeholders = Record<string, string | null | undefined>;

const TOKEN = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/gi;

export function fill(template: string, values: Placeholders): string {
  return template.replace(TOKEN, (whole, name: string) => {
    const value = values[name.toLowerCase()];
    return value === null || value === undefined ? whole : value;
  });
}

/**
 * Applies the values to every field of a template at once.
 *
 * Returns the same shape, so callers can substitute first and then treat the
 * result as plain content with no placeholders left to think about.
 */
export function fillTemplate(
  template: EmailTemplate,
  values: Placeholders,
): EmailTemplate {
  return {
    key: template.key,
    subject: fill(template.subject, values),
    preheader: template.preheader ? fill(template.preheader, values) : null,
    heading: fill(template.heading, values),
    intro: template.intro ? fill(template.intro, values) : null,
    steps: template.steps.map((step) => ({
      title: fill(step.title, values),
      body: fill(step.body, values),
    })),
    button: template.button
      ? {
          label: fill(template.button.label, values),
          href: fill(template.button.href, values),
        }
      : null,
    note: template.note ? fill(template.note, values) : null,
  };
}
