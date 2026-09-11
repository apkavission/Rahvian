import "server-only";

import { getEmailBrand } from "@/lib/email/brand";
import { buildAccountCredentials } from "@/lib/email/templates/account-credentials";
import { buildLeadAcknowledgement } from "@/lib/email/templates/lead-acknowledgement";
import { buildLeadNotification } from "@/lib/email/templates/lead-notification";

/**
 * Every email this application sends, built with invented data.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** Until now there was no way to look at an email without
 * causing one to be sent. So the only people who ever saw the design were the
 * people receiving it, and the only way to check a change was to submit a real
 * enquiry or create a real account — which is why nobody checked.
 *
 * ---------------------------------------------------------------------------
 * **The real builders, not copies of them.**
 *
 * Each entry calls the same function the application calls, so the preview
 * shows what actually goes out — including the copy stored in
 * `company.email_templates`, which is editable and therefore the part most
 * likely to be wrong. A preview assembled from its own markup would show a
 * design nobody receives, and would keep looking right after the real one
 * broke.
 *
 * ---------------------------------------------------------------------------
 * **The invented data is deliberately awkward.** A long name, an unusual
 * budget, a description with line breaks in it, an address with an ampersand.
 * A preview built from "John Smith" and one short sentence is a preview that
 * agrees with everything.
 */

export interface EmailSample {
  key: string;
  name: string;
  /** Who receives it, and when — the two questions somebody asks first. */
  when: string;
  subject: string;
  html: string;
  /** The plain-text half, which some people genuinely read. */
  text: string;
}

/**
 * The mark, for a preview.
 *
 * A real message carries the logo as an attached part and references it as
 * `cid:…`, which is what makes it render before anybody presses "show images".
 * Nothing outside a mail client can resolve that, so in the preview — and only
 * in the preview — it points at the same image served from `public/`.
 */
function withVisibleLogo(html: string): string {
  return html.replace(/cid:[a-z0-9-]+/gi, "/brand/logo-email.png");
}

export async function emailSamples(): Promise<EmailSample[]> {
  const brand = await getEmailBrand();

  const [acknowledgement, notification, credentials, reset] = await Promise.all([
    buildLeadAcknowledgement(
      {
        name: "Priyanka Raghunathan",
        email: "priyanka@northfieldclinic.in",
        serviceName: "Website and booking system",
        budgetRange: "₹1,50,000 – ₹3,00,000",
        timeline: "Before the new session starts",
        description:
          "We are a three-doctor clinic in Ranchi.\n\nAppointments are on WhatsApp and half of them are missed. We want online booking and something the receptionist can actually use — she is not technical.",
      },
      brand,
    ),

    buildLeadNotification(
      {
        id: "3f2c1a90-0000-4000-8000-000000000001",
        name: "Priyanka Raghunathan",
        email: "priyanka@northfieldclinic.in",
        companyName: "Northfield Clinic & Diagnostics",
        phone: "+91 98765 43210",
        whatsapp: "+91 98765 43210",
        serviceName: "Website and booking system",
        budgetRange: "₹1,50,000 – ₹3,00,000",
        timeline: "Before the new session starts",
        description:
          "We are a three-doctor clinic in Ranchi.\n\nAppointments are on WhatsApp and half of them are missed.",
        existingWebsite: "https://northfieldclinic.in",
        preferredContact: "whatsapp",
        sourcePage: "/services/websites",
      },
      brand.email ?? "hello@rahvian.com",
      brand,
    ),

    buildAccountCredentials(
      {
        name: "Rahul Kumar",
        email: "rahul@rahvian.com",
        password: "wander-lentil-42",
        roleLabel: "Editor",
        reason: "created",
      },
      brand,
    ),

    buildAccountCredentials(
      {
        name: "Rahul Kumar",
        email: "rahul@rahvian.com",
        password: "copper-window-19",
        roleLabel: "Editor",
        reason: "reset",
      },
      brand,
    ),
  ]);

  const built: Array<[EmailSample["key"], string, string, typeof acknowledgement]> = [
    [
      "lead_acknowledgement",
      "Enquiry received",
      "To whoever filled in a form on the website, the moment they send it.",
      acknowledgement,
    ],
    [
      "lead_notification",
      "New enquiry",
      "To us, when an enquiry arrives. The one that has to be readable on a phone at a traffic light.",
      notification,
    ],
    [
      "account_credentials",
      "New account",
      "To somebody being given access to this admin for the first time.",
      credentials,
    ],
    [
      "account_credentials_reset",
      "Password reset",
      "To somebody whose password has been reset for them.",
      reset,
    ],
  ];

  return built.map(([key, name, when, message]) => ({
    key,
    name,
    when,
    subject: message.subject,
    html: withVisibleLogo(message.html ?? ""),
    text: message.text,
  }));
}
