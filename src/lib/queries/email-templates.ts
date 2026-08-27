import "server-only";

import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache/tags";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Editable copy for one transactional email.
 *
 * Read with the service role rather than the cached anon client, because
 * `company.email_templates` carries no anon grant — these never render on a
 * public page and the browser has no reason to hold them.
 *
 * The shape is declared here rather than derived from `Database` because it is
 * what the rest of the application consumes: `steps` and `button` are jsonb in
 * the database and therefore `Json` in the generated types, and every caller
 * would otherwise repeat the same narrowing.
 */
export interface EmailTemplate {
  key: string;
  subject: string;
  preheader: string | null;
  heading: string;
  intro: string | null;
  steps: Array<{ title: string; body: string }>;
  button: { label: string; href: string } | null;
  note: string | null;
}

/**
 * One template, or null when there is nothing usable.
 *
 * Null covers every case that means the same thing to the caller — no row, a
 * deactivated row, or a read that failed. Each falls back to the copy compiled
 * into the application, which is why a missing template can never produce an
 * email with empty fields.
 */
export function getEmailTemplate(key: string) {
  return unstable_cache(
    async (): Promise<EmailTemplate | null> => {
      const supabase = createAdminClient();

      const { data, error } = await supabase
        .from("email_templates")
        .select("key, subject, preheader, heading, intro, steps, button, note")
        .eq("key", key)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        // Logged at info, not error. A template that cannot be read is not a
        // failure: the caller falls back to the copy compiled into the
        // application and the email still goes out correctly.
        console.info(
          `[email-templates] "${key}" unavailable (${error.message}); using built-in copy.`,
        );
        return null;
      }

      if (!data) return null;

      return {
        key: data.key,
        subject: data.subject,
        preheader: data.preheader,
        heading: data.heading,
        intro: data.intro,
        steps: normaliseSteps(data.steps),
        button: normaliseButton(data.button),
        note: data.note,
      };
    },
    ["email-template", key],
    { tags: [CACHE_TAGS.emailTemplates] },
  )();
}

/** jsonb is `unknown` at the type level; anything malformed becomes no steps. */
function normaliseSteps(value: unknown): Array<{ title: string; body: string }> {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const step = entry as Record<string, unknown>;
    if (typeof step.title !== "string" || typeof step.body !== "string") return [];
    return [{ title: step.title, body: step.body }];
  });
}

function normaliseButton(value: unknown): { label: string; href: string } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const button = value as Record<string, unknown>;
  if (typeof button.label !== "string" || typeof button.href !== "string") {
    return null;
  }
  return { label: button.label, href: button.href };
}
