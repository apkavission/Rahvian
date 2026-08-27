import { z } from "zod";

/**
 * Site settings.
 *
 * This is the row that fills in every contact detail the public site currently
 * renders as absent — the footer, the contact panel, the email signature, the
 * Organization JSON-LD. Nothing here is required beyond the company's own
 * names: a business that has not registered a GST number yet should be able to
 * save the rest rather than be blocked by a field it cannot fill honestly.
 *
 * Parsed on the server because the Server Action is the boundary; the client
 * shows the same messages inline from the returned field errors.
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
 * A social profile link.
 *
 * Rejected unless it is a full `https://` URL. A bare handle or a
 * `linkedin.com/...` without a scheme renders as a relative link on our own
 * domain, which is a broken link that looks fine in the form.
 */
const socialUrl = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .refine(
    (value) => value === null || /^https:\/\/\S+$/.test(value),
    "Use the full address, starting with https://",
  );

export const settingsSchema = z.object({
  company_name: z
    .string()
    .trim()
    .min(1, "The public brand name is required.")
    .max(120, "That name is too long."),

  legal_name: z
    .string()
    .trim()
    .min(1, "The registered company name is required.")
    .max(160, "That name is too long."),

  tagline: z.string().trim().max(200, "Keep the tagline under 200 characters."),

  email: optionalText(254)
    .refine(
      (value) => value === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
      "That does not look like an email address.",
    ),

  phone: optionalText(32),
  whatsapp: optionalText(32),

  address_line1: optionalText(160),
  address_line2: optionalText(160),
  city: optionalText(80),
  state: optionalText(80),
  postal_code: optionalText(16),
  country: z.string().trim().min(1, "Country is required.").max(80),

  cin: optionalText(32),
  gst: optionalText(32),

  /*
    The two logo assets, as ids from the media library.

    Shape only, here. That an id names a real asset is checked in the Server
    Action against the same list the picker was built from — this file has no
    database access and a schema that pretended to verify one would be a check
    in name only.
  */
  logo_light_id: optionalText(64),
  logo_dark_id: optionalText(64),

  linkedin: socialUrl,
  github: socialUrl,
  x: socialUrl,
  instagram: socialUrl,
  facebook: socialUrl,
  youtube: socialUrl,
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** The social platforms the form offers, in the order it offers them. */
export const SOCIAL_FIELDS = [
  { name: "linkedin", label: "LinkedIn" },
  { name: "github", label: "GitHub" },
  { name: "x", label: "X" },
  { name: "instagram", label: "Instagram" },
  { name: "facebook", label: "Facebook" },
  { name: "youtube", label: "YouTube" },
] as const;

export type SocialField = (typeof SOCIAL_FIELDS)[number]["name"];

export interface SettingsFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const initialSettingsState: SettingsFormState = {
  status: "idle",
  message: "",
};
