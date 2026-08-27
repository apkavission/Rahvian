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
 * The internal "new enquiry" notification.
 *
 * Plain text carries the whole message and the HTML only formats it. That
 * ordering is deliberate: this mail is read on a phone, often in a client that
 * strips styles, and the details must survive that. The HTML is a convenience,
 * never the only copy.
 *
 * Subject and body copy come from `company.email_templates`. `FALLBACK` is
 * what sends when that row is missing or deactivated.
 */

const TEMPLATE_KEY = "lead_notification";

const FALLBACK: EmailTemplate = {
  key: TEMPLATE_KEY,
  subject: "New enquiry — {{name}}{{service_suffix}}",
  preheader: "{{name}}{{service_suffix}} — {{description_excerpt}}",
  heading: "New enquiry",
  intro:
    "{{name}} sent this through the website. Replying to this email goes straight to them.",
  steps: [],
  button: null,
  note: "Lead ID {{lead_id}}",
};

/** The column stores the raw enum; nobody wants to read "whatsapp" in an email. */
const CONTACT_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
};

export interface LeadNotificationData {
  id: string;
  name: string;
  email: string;
  companyName: string | null;
  phone: string | null;
  whatsapp: string | null;
  serviceName: string | null;
  budgetRange: string | null;
  timeline: string | null;
  description: string;
  existingWebsite: string | null;
  preferredContact: string | null;
  sourcePage: string | null;
}

export async function buildLeadNotification(
  lead: LeadNotificationData,
  recipient: string,
  brand: EmailBrand,
): Promise<MailMessage> {
  const preferred = lead.preferredContact
    ? (CONTACT_LABELS[lead.preferredContact] ?? lead.preferredContact)
    : null;

  const stored = await getEmailTemplate(TEMPLATE_KEY);

  const copy = fillTemplate(stored ?? FALLBACK, {
    name: lead.name,
    first_name: lead.name.trim().split(/\s+/)[0] ?? lead.name,
    company_name: brand.companyName,
    client_company: lead.companyName,
    service_name: lead.serviceName,
    // Empty rather than absent, so a subject reads "New enquiry — Rohit"
    // cleanly when no service was chosen.
    service_suffix: lead.serviceName ? ` (${lead.serviceName})` : "",
    description_excerpt: truncate(lead.description, 90),
    lead_id: lead.id,
    site_url: brand.siteUrl,
  });

  const rows: Array<[string, string | null]> = [
    ["Name", lead.name],
    ["Company", lead.companyName],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["WhatsApp", lead.whatsapp],
    ["Prefers", preferred],
    ["Service", lead.serviceName],
    ["Budget", lead.budgetRange],
    ["Timeline", lead.timeline],
    ["Existing site", lead.existingWebsite],
    ["Came from", lead.sourcePage],
  ];

  const present = rows.filter((row): row is [string, string] => Boolean(row[1]));

  const text = [
    copy.heading,
    "",
    ...present.map(([label, value]) => `${label}: ${value}`),
    "",
    "What they need:",
    lead.description,
    "",
    `Reply to this email to answer ${lead.name} directly.`,
    copy.note ?? "",
    "",
    brand.companyName,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = renderEmail({
    preheader: copy.preheader ?? copy.heading,
    heading: copy.heading,
    intro: copy.intro ?? undefined,
    steps: copy.steps,
    button: copy.button ?? undefined,
    rows: present,
    blocks: [{ label: "What they need", body: lead.description }],
    note: copy.note ?? undefined,
    brand,
  });

  return {
    to: recipient,
    subject: copy.subject,
    text,
    html,
    // Replying in the mail client goes to the client, not back to ourselves.
    replyTo: lead.email,
    attachments: [await logoAttachment()],
  };
}

function truncate(value: string, max: number): string {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max - 1)}…`;
}
