import { z } from "zod";
import type { Json } from "@/types/database";

/**
 * The site-wide SEO defaults.
 *
 * One row, `seo_defaults`, and it decides three different things: what a page
 * is called when it does not name itself, what search engines are told about
 * the company, and whether the site may be indexed at all. The last of those
 * is the switch that takes the site live, which is why it is treated
 * differently everywhere it appears.
 *
 * Parsed on the server because the Server Action is the boundary; the client
 * shows the same messages inline from the returned field errors. Nothing in
 * this file touches the database or the network, so the form imports it too
 * and the preview cannot disagree with what will actually be rendered.
 */

/** Empty optional inputs arrive as "" from FormData; store null instead. */
const optionalText = (max: number, message?: string) =>
  z
    .string()
    .trim()
    .max(max, message ?? `Keep this under ${max} characters.`)
    .transform((value) => (value === "" ? null : value))
    .nullable();

/**
 * A verification token, not the tag it came in.
 *
 * Both Google and Bing hand over a whole `<meta …>` element, and pasting the
 * element is the obvious mistake — the site then advertises a token of
 * `<meta name="google-site-verification" content="…" />`, verification fails,
 * and nothing on the screen says why. Refusing it with the reason costs one
 * regular expression.
 */
const verificationToken = (max: number) =>
  optionalText(max).refine(
    (value) => value === null || !/[<>\s"]/.test(value),
    "Paste only the content value, not the whole <meta> tag.",
  );

/**
 * The title template.
 *
 * `%s` is required. `buildMetadata` returns the page title unchanged when the
 * template has no placeholder — the safe behaviour, but a silent one: the
 * owner would see the site suffix vanish from every tab with nothing having
 * failed. Refusing it here is where that gets said out loud.
 */
export const TITLE_TEMPLATE_PLACEHOLDER = "%s";

/**
 * Where a search result stops showing the words.
 *
 * Google truncates on pixel width, not on characters, so these are guides
 * rather than limits and the form treats them as such — a count that turns
 * amber, never a field that refuses to save. A title of 62 good characters
 * beats one of 60 padded ones.
 */
export const TITLE_TARGET = 60;
export const DESCRIPTION_TARGET = 160;

export const seoSchema = z.object({
  title_template: z
    .string()
    .trim()
    .min(1, "The title template is required.")
    .max(120, "That template is too long.")
    .refine(
      (value) => value.includes(TITLE_TEMPLATE_PLACEHOLDER),
      "The template must contain %s — that is where each page's own title goes. Without it the template is ignored entirely.",
    ),

  default_title: z
    .string()
    .trim()
    .min(1, "The fallback title is required.")
    .max(200, "That title is too long."),

  default_description: z
    .string()
    .trim()
    .min(1, "The fallback description is required.")
    .max(320, "That description is too long."),

  google_verification: verificationToken(128),
  bing_verification: verificationToken(128),

  /*
    The Organization override, as typed.

    Carried as text through the form and turned into an object in the action,
    because a textarea can only post a string and the parse failure has to
    become a message beside the field rather than an exception. Shape is
    checked here; what it means to search engines is not something any schema
    can check.
  */
  organization_schema: z.string(),

  // An unticked checkbox is absent from FormData, which is the whole of the
  // encoding: present means ticked.
  site_noindex: z
    .string()
    .optional()
    .transform((value) => value === "on"),
});

export type SeoInput = z.infer<typeof seoSchema>;

export interface SeoFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const initialSeoState: SeoFormState = {
  status: "idle",
  message: "",
};

/**
 * A page title with the template applied.
 *
 * Shared by `buildMetadata`, which renders it, and by the admin's search-result
 * preview, which claims to show what will be rendered. Two implementations of
 * this would make the preview a guess — and a preview that is a guess is worse
 * than none, because it gets believed.
 *
 * A template with no placeholder returns the title unchanged. The form refuses
 * to save one, so this only ever applies to a row written before that rule
 * existed.
 */
export function applyTitleTemplate(
  template: string | null | undefined,
  title: string,
): string {
  if (!template || !template.includes(TITLE_TEMPLATE_PLACEHOLDER)) return title;
  return template.replace(TITLE_TEMPLATE_PLACEHOLDER, title);
}

/**
 * The Organization override, as an object, or a sentence saying why not.
 *
 * Empty is a legitimate answer and the common one: an empty override means the
 * graph is generated from `site_settings`, which is what should happen until
 * somebody has a specific reason otherwise.
 *
 * An array or a bare value is refused rather than coerced. `organization_schema`
 * is spread into the Organization node, and spreading an array produces
 * numeric keys — a graph that parses, validates as nothing, and looks fine in
 * the form.
 */
export function parseOrganizationSchema(
  input: string,
):
  | { ok: true; value: { [key: string]: Json | undefined } }
  | { ok: false; message: string } {
  const text = input.trim();
  if (text === "") return { ok: true, value: {} };

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message:
        "That is not valid JSON. Check for a trailing comma, a missing quote, or a curly quote pasted from a document.",
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      ok: false,
      message: "This has to be a JSON object — one set of curly braces, with properties inside.",
    };
  }

  // It came out of `JSON.parse`, so it is JSON by construction — the assertion
  // states that rather than assuming anything the checks above have not proved.
  return { ok: true, value: parsed as { [key: string]: Json | undefined } };
}
