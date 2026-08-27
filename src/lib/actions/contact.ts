"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminRecipient, sendMail } from "@/lib/email/mailer";
import { getEmailBrand } from "@/lib/email/brand";
import { buildLeadNotification } from "@/lib/email/templates/lead-notification";
import { buildLeadAcknowledgement } from "@/lib/email/templates/lead-acknowledgement";
import { getRequestContext, hashValue } from "@/lib/leads/request-context";
import { checkRateLimit, recordSubmission } from "@/lib/leads/rate-limit";
import {
  CONSENT_TEXT,
  contactFormSchema,
  type ContactFormParsed,
  type ContactFormState,
} from "@/lib/validation/contact";

/**
 * Rate-limit bucket. Separate from the quote form's, deliberately: someone who
 * has just sent a brief should still be able to ask a follow-up question, and
 * one shared counter would refuse them.
 */
const FORM_KEY = "contact";

/**
 * Receives a contact enquiry.
 *
 * Lives in `lib/actions` rather than beside a route, because the section that
 * renders this form is placed from the admin panel and can appear on any page.
 *
 * Same order of operations as the quote request: the lead is written first,
 * because that row is the thing the business cannot afford to lose, and mail
 * failures are logged rather than surfaced. Someone who filled the form in
 * correctly should never see an error caused by our mail server.
 */
export async function submitContactEnquiry(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactFormSchema.safeParse({
    name: formData.get("name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    company_name: formData.get("company_name") ?? "",
    service_id: formData.get("service_id") ?? "",
    message: formData.get("message") ?? "",
    consent_given: formData.get("consent_given") ?? false,
    website_url: formData.get("website_url") ?? "",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }

    return {
      status: "error",
      message: "Please check the highlighted fields and try again.",
      fieldErrors,
    };
  }

  const enquiry = parsed.data;

  // Honeypot filled means a bot completed every input it could find.
  // Reporting success is intentional: an error tells the author what to fix.
  if (enquiry.website_url) {
    return {
      status: "success",
      message: "Thank you. We have your message and will reply shortly.",
    };
  }

  const context = await getRequestContext();
  const emailHash = hashValue(enquiry.email);

  const limit = await checkRateLimit({
    formKey: FORM_KEY,
    ipHash: context.ipHash,
    emailHash,
  });

  if (!limit.allowed) {
    await recordSubmission({
      formKey: FORM_KEY,
      ipHash: context.ipHash,
      emailHash,
      succeeded: false,
    });
    return { status: "error", message: limit.message ?? "Please try again later." };
  }

  const supabase = createAdminClient();

  const { data: inserted, error } = await supabase
    .from("leads")
    .insert({
      name: enquiry.name,
      company_name: enquiry.company_name ?? null,
      email: enquiry.email,
      phone: enquiry.phone ?? null,
      service_id: enquiry.service_id,
      description: enquiry.message,
      source_page: (formData.get("source_page") as string) || null,
      referrer: context.referrer,
      // The form carries no campaign parameters — see the note on the client
      // component. The column is not nullable, so the empty object is written
      // rather than left to the database default.
      utm: {},
      ip_hash: context.ipHash,
      user_agent: context.userAgent,
      consent_given: true,
      consent_text: CONSENT_TEXT,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[contact] insert failed:", error?.message);
    await recordSubmission({
      formKey: FORM_KEY,
      ipHash: context.ipHash,
      emailHash,
      succeeded: false,
    });
    return {
      status: "error",
      message:
        "Something went wrong on our side and your message was not saved. " +
        "Please try again, or email us directly.",
    };
  }

  await recordSubmission({
    formKey: FORM_KEY,
    ipHash: context.ipHash,
    emailHash,
    succeeded: true,
  });

  await sendEnquiryEmails(inserted.id, enquiry, formData);

  return {
    status: "success",
    message: "Thank you. We have your message and will reply within one working day.",
  };
}

/**
 * Both emails, sent together.
 *
 * The same two templates the quote form uses. A contact message carries fewer
 * fields, and the templates already omit what is missing — a second pair of
 * near-identical emails would be two more places for the wording to drift.
 *
 * Every failure here is swallowed: the lead is saved, so there is nothing the
 * sender can do about a mail problem and nothing useful to tell them.
 */
async function sendEnquiryEmails(
  id: string,
  enquiry: ContactFormParsed,
  formData: FormData,
): Promise<void> {
  const recipient = getAdminRecipient();

  let serviceName: string | null = null;

  if (enquiry.service_id) {
    const { data } = await createAdminClient()
      .from("services")
      .select("name")
      .eq("id", enquiry.service_id)
      .single();
    serviceName = data?.name ?? null;
  }

  const brand = await getEmailBrand();

  if (!recipient) {
    console.info(
      `[contact] lead ${id} saved; no EMAIL_TO_ADMIN set, no internal mail sent.`,
    );
  }

  const internal = recipient
    ? buildLeadNotification(
        {
          id,
          name: enquiry.name,
          email: enquiry.email,
          companyName: enquiry.company_name ?? null,
          phone: enquiry.phone ?? null,
          whatsapp: null,
          serviceName,
          budgetRange: null,
          timeline: null,
          description: enquiry.message,
          existingWebsite: null,
          preferredContact: null,
          sourcePage: (formData.get("source_page") as string) || null,
        },
        recipient,
        brand,
      ).then(sendMail)
    : Promise.resolve();

  const confirmation = buildLeadAcknowledgement(
    {
      name: enquiry.name,
      email: enquiry.email,
      serviceName,
      budgetRange: null,
      timeline: null,
      description: enquiry.message,
    },
    brand,
  ).then(sendMail);

  await Promise.all([internal, confirmation]);
}
