import "server-only";

import type { MailMessage } from "@/lib/email/mailer";
import {
  logoAttachment,
  renderEmail,
  type EmailBrand,
} from "@/lib/email/layout";
import { fillTemplate } from "@/lib/email/placeholders";
import {
  getEmailTemplate,
  type EmailTemplate,
} from "@/lib/queries/email-templates";

/**
 * The confirmation the person who filled in the form receives.
 *
 * This is the first thing a prospective client ever gets from the company, and
 * for most of them it arrives before any human has read their enquiry. So it
 * does three jobs and refuses a fourth:
 *
 *   It confirms the enquiry arrived, because the alternative is wondering.
 *   It says what happens next and by when, so the wait has a shape.
 *   It repeats back what they sent, so they have their own record of it.
 *
 * It does not sell. Nobody who has just asked for a quote wants a brochure,
 * and a pitch here reads as automated where reassurance reads as attentive.
 *
 * Every word is editable from the admin panel. `FALLBACK` below is what sends
 * when the row is missing or deactivated — it is not the source of truth, it
 * is the guarantee that there is always something to send.
 */

const TEMPLATE_KEY = "lead_acknowledgement";

const FALLBACK: EmailTemplate = {
  key: TEMPLATE_KEY,
  subject: "We have your enquiry, {{first_name}} — {{company_name}}",
  preheader:
    "Thanks {{first_name}} — we have your enquiry and will reply within one working day.",
  heading: "Thank you, {{first_name}}",
  intro: "Your enquiry has reached {{company_name}}. Here is what happens next.",
  steps: [
    {
      title: "We read it properly",
      body: "A person goes through your enquiry — not an auto-responder deciding whether you are worth a reply.",
    },
    {
      title: "You get a real answer within one working day",
      body: "Scope, timeline and price. If something in your brief changes the price, we say which part and why.",
    },
    {
      title: "We talk only if it is useful",
      body: "If the written answer is enough, take it and decide in your own time. No call is required to get a number out of us.",
    },
  ],
  button: { label: "See what we do", href: "{{site_url}}/services" },
  note: "If anything above is wrong, reply to this email and we will correct it.",
};

export interface LeadAcknowledgementData {
  name: string;
  email: string;
  serviceName: string | null;
  budgetRange: string | null;
  timeline: string | null;
  description: string;
}

export async function buildLeadAcknowledgement(
  lead: LeadAcknowledgementData,
  brand: EmailBrand,
): Promise<MailMessage> {
  // Only the first name. "Dear Rohit Sharma" reads like a bank letter.
  const firstName = lead.name.trim().split(/\s+/)[0] ?? lead.name;

  const stored = await getEmailTemplate(TEMPLATE_KEY);

  const copy = fillTemplate(stored ?? FALLBACK, {
    first_name: firstName,
    name: lead.name,
    company_name: brand.companyName,
    legal_name: brand.legalName,
    service_name: lead.serviceName,
    site_url: brand.siteUrl,
  });

  const rows: Array<[string, string]> = [
    ["Service", lead.serviceName ?? "Not decided yet"],
    ...((lead.budgetRange ? [["Budget", lead.budgetRange]] : []) as Array<
      [string, string]
    >),
    ...((lead.timeline ? [["Timeline", lead.timeline]] : []) as Array<
      [string, string]
    >),
  ];

  const links = [
    brand.phone
      ? { label: "Call us", href: `tel:${brand.phone.replace(/\s+/g, "")}` }
      : null,
    brand.email ? { label: "Email us", href: `mailto:${brand.email}` } : null,
  ].filter((link): link is { label: string; href: string } => link !== null);

  const text = [
    `Hi ${firstName},`,
    "",
    copy.intro ?? "",
    "",
    ...(copy.steps.length
      ? [
          "What happens next:",
          ...copy.steps.map(
            (step, index) => `  ${index + 1}. ${step.title} — ${step.body}`,
          ),
          "",
        ]
      : []),
    "What you sent us:",
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    "",
    lead.description,
    "",
    copy.note ?? "",
    "",
    brand.companyName,
    brand.legalName && brand.legalName !== brand.companyName
      ? `A unit of ${brand.legalName}`
      : "",
    brand.siteUrl,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = renderEmail({
    preheader: copy.preheader ?? copy.heading,
    heading: copy.heading,
    intro: copy.intro ?? undefined,
    steps: copy.steps,
    button: copy.button ?? undefined,
    links,
    rows,
    blocks: [{ label: "What you told us", body: lead.description }],
    note: copy.note ?? undefined,
    brand,
  });

  return {
    to: lead.email,
    subject: copy.subject,
    text,
    html,
    // A reply goes to the company inbox, which is where the conversation
    // should continue.
    replyTo: brand.email ?? undefined,
    attachments: [await logoAttachment()],
  };
}
