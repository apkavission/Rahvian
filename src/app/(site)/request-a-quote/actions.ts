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
  leadFormSchema,
  type LeadFormState,
} from "@/lib/validation/lead";

const FORM_KEY = "request-a-quote";

/**
 * Receives a quote request.
 *
 * The order of operations is the important part. The lead is written to the
 * database before anything else is attempted, because that row is the thing
 * the business cannot afford to lose. Notification mail is sent afterwards and
 * its failure is logged rather than surfaced — a client who filled in the form
 * correctly should never see an error caused by our mail server.
 */
export async function submitQuoteRequest(
  _previous: LeadFormState,
  formData: FormData,
): Promise<LeadFormState> {
  const parsed = leadFormSchema.safeParse({
    name: formData.get("name") ?? "",
    company_name: formData.get("company_name") ?? "",
    email: formData.get("email") ?? "",
    phone: formData.get("phone") ?? "",
    whatsapp: formData.get("whatsapp") ?? "",
    service_id: formData.get("service_id") ?? "",
    budget_range: formData.get("budget_range") || null,
    timeline: formData.get("timeline") || null,
    description: formData.get("description") ?? "",
    existing_website: formData.get("existing_website") ?? "",
    preferred_contact: formData.get("preferred_contact") || null,
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

  const lead = parsed.data;

  // Honeypot filled means a bot walked the DOM and completed every input.
  // Reporting success is intentional: an error tells the author what to fix.
  if (lead.website_url) {
    return {
      status: "success",
      message: "Thank you. We have your enquiry and will reply shortly.",
    };
  }

  const context = await getRequestContext();
  const emailHash = hashValue(lead.email);

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
      name: lead.name,
      company_name: lead.company_name ?? null,
      email: lead.email,
      phone: lead.phone ?? null,
      whatsapp: lead.whatsapp ?? null,
      service_id: lead.service_id,
      budget_range: lead.budget_range ?? null,
      timeline: lead.timeline ?? null,
      description: lead.description,
      existing_website: lead.existing_website ?? null,
      preferred_contact: lead.preferred_contact ?? null,
      source_page: (formData.get("source_page") as string) || null,
      referrer: context.referrer,
      utm: readUtm(formData),
      ip_hash: context.ipHash,
      user_agent: context.userAgent,
      consent_given: true,
      consent_text: CONSENT_TEXT,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("[quote] insert failed:", error?.message);
    await recordSubmission({
      formKey: FORM_KEY,
      ipHash: context.ipHash,
      emailHash,
      succeeded: false,
    });
    return {
      status: "error",
      message:
        "Something went wrong on our side and your enquiry was not saved. " +
        "Please try again, or email us directly.",
    };
  }

  await recordSubmission({
    formKey: FORM_KEY,
    ipHash: context.ipHash,
    emailHash,
    succeeded: true,
  });

  await sendLeadEmails(inserted.id, lead, formData);

  return {
    status: "success",
    message: "Thank you. We have your enquiry and will reply within one working day.",
  };
}

/** Collects utm_* parameters the form carried through as hidden inputs. */
function readUtm(formData: FormData): Record<string, string> {
  const utm: Record<string, string> = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ]) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim()) {
      utm[key] = value.trim().slice(0, 200);
    }
  }
  return utm;
}

/**
 * Sends both emails: the internal notification and the client's confirmation.
 *
 * Every failure path here is swallowed. The lead is already saved, so there is
 * nothing the person who submitted it can do about a mail problem, and nothing
 * useful to tell them.
 *
 * The two sends run together rather than in sequence. They are independent —
 * a bounced internal address must not cost the client their confirmation, and
 * a typo in the client's address must not cost us the notification.
 */
async function sendLeadEmails(
  id: string,
  lead: Awaited<ReturnType<typeof leadFormSchema.parseAsync>>,
  formData: FormData,
): Promise<void> {
  const recipient = getAdminRecipient();

  let serviceName: string | null = null;

  if (lead.service_id) {
    const { data } = await createAdminClient()
      .from("services")
      .select("name")
      .eq("id", lead.service_id)
      .single();
    serviceName = data?.name ?? null;
  }

  const brand = await getEmailBrand();

  if (!recipient) {
    console.info(
      `[quote] lead ${id} saved; no EMAIL_TO_ADMIN set, no internal mail sent.`,
    );
  }

  const internal = recipient
    ? buildLeadNotification(
        {
          id,
          name: lead.name,
          email: lead.email,
          companyName: lead.company_name ?? null,
          phone: lead.phone ?? null,
          whatsapp: lead.whatsapp ?? null,
          serviceName,
          budgetRange: lead.budget_range ?? null,
          timeline: lead.timeline ?? null,
          description: lead.description,
          existingWebsite: lead.existing_website ?? null,
          preferredContact: lead.preferred_contact ?? null,
          sourcePage: (formData.get("source_page") as string) || null,
        },
        recipient,
        brand,
      ).then(sendMail)
    : Promise.resolve();

  const confirmation = buildLeadAcknowledgement(
    {
      name: lead.name,
      email: lead.email,
      serviceName,
      budgetRange: lead.budget_range ?? null,
      timeline: lead.timeline ?? null,
      description: lead.description,
    },
    brand,
  ).then(sendMail);

  await Promise.all([internal, confirmation]);
}
