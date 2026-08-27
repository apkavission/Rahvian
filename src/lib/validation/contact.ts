import { z } from "zod";
import { CONSENT_TEXT } from "@/lib/validation/lead";

/**
 * The contact form.
 *
 * A deliberately shorter form than the quote request. Someone who arrives on
 * the contact page has a question, not a brief, and asking them for a budget
 * band before they have asked their question is how an enquiry gets abandoned.
 * Both forms write to the same `leads` table — a question and a brief are the
 * same business object at different levels of detail — so nothing downstream
 * has to know which one was used.
 *
 * Parsed on both sides: the client shows inline errors, the Server Action
 * parses again because it is a public endpoint anyone can post to directly.
 */

export { CONSENT_TEXT };

/** Empty optional inputs arrive as "" from FormData; store null instead. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(120, "That name is too long."),

  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(254, "That email address is too long.")
    .pipe(z.email("That does not look like an email address.")),

  phone: optionalText(32),
  company_name: optionalText(160),

  // Empty means "no particular service"; the action resolves this to a real id.
  service_id: z
    .union([z.uuid(), z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),

  message: z
    .string()
    .trim()
    .min(10, "Please tell us a little more — at least 10 characters.")
    .max(5000, "Please keep this under 5000 characters."),

  consent_given: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((value) => value === true || value === "on" || value === "true", {
      message: "We need your agreement before we can contact you.",
    })
    .transform(() => true),

  // Honeypot. Hidden from people, irresistible to naive bots.
  website_url: z.string().max(0).optional().or(z.literal("")),
});

export type ContactFormParsed = z.output<typeof contactFormSchema>;

/** Shape returned by the Server Action to `useActionState`. */
export interface ContactFormState {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string>;
}

export const initialContactFormState: ContactFormState = {
  status: "idle",
  message: "",
};
