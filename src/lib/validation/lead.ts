import { z } from "zod";

/**
 * The quote request form, validated once and used on both sides.
 *
 * The client uses this schema to show errors as the person types. The Server
 * Action parses the same schema again, because client validation is a courtesy
 * and never a control — the action is a public HTTP endpoint that anyone can
 * post to directly.
 */

export const PREFERRED_CONTACT = ["email", "phone", "whatsapp"] as const;

export const BUDGET_RANGES = [
  "Under ₹50,000",
  "₹50,000 – ₹1,50,000",
  "₹1,50,000 – ₹5,00,000",
  "₹5,00,000 – ₹10,00,000",
  "Over ₹10,00,000",
  "Not sure yet",
] as const;

export const TIMELINES = [
  "As soon as possible",
  "Within a month",
  "One to three months",
  "More than three months",
  "Just exploring",
] as const;

/**
 * Stored verbatim on the lead row alongside `consent_given`.
 *
 * The DPDP Act 2023 requires consent to be informed and specific, which means
 * the record has to show what the person actually agreed to — not a boolean
 * whose meaning drifts the next time this copy is edited. Changing this string
 * changes it only for future submissions; existing rows keep the words that
 * were on screen when they were submitted.
 */
export const CONSENT_TEXT =
  "I agree that Apka Vission may use the details above to contact me about " +
  "this enquiry. I understand I can ask for my details to be corrected or " +
  "deleted at any time.";

/** Empty optional inputs arrive as "" from FormData; store null instead. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const leadFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "That name is too long."),

  company_name: optionalText(160),

  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("That does not look like an email address.")),

  phone: optionalText(32),
  whatsapp: optionalText(32),

  // Empty means "no particular service"; the action resolves this to a real id.
  service_id: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),

  budget_range: z
    .enum(BUDGET_RANGES)
    .nullable()
    .optional()
    .catch(null),

  timeline: z.enum(TIMELINES).nullable().optional().catch(null),

  description: z
    .string()
    .trim()
    .min(20, "Please tell us a little more — at least 20 characters.")
    .max(5000, "Please keep this under 5000 characters."),

  existing_website: optionalText(300),

  preferred_contact: z
    .enum(PREFERRED_CONTACT)
    .nullable()
    .optional()
    .catch(null),

  consent_given: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((value) => value === true || value === "on" || value === "true", {
      message: "We need your agreement before we can contact you.",
    })
    .transform(() => true),

  // Honeypot. Hidden from people, irresistible to naive bots. A filled value
  // is the single clearest spam signal available without a challenge widget.
  website_url: z.string().max(0).optional().or(z.literal("")),
});

export type LeadFormValues = z.input<typeof leadFormSchema>;
export type LeadFormParsed = z.output<typeof leadFormSchema>;

/** Shape returned by the Server Action to `useActionState`. */
export interface LeadFormState {
  status: "idle" | "success" | "error";
  message: string;
  /** Field name to first error message, for inline display. */
  fieldErrors?: Record<string, string>;
}

export const initialLeadFormState: LeadFormState = {
  status: "idle",
  message: "",
};
