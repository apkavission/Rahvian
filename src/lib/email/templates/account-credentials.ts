import "server-only";

import type { MailMessage } from "@/lib/email/mailer";
import { logoAttachment, renderEmail, type EmailBrand } from "@/lib/email/layout";
import { fillTemplate } from "@/lib/email/placeholders";
import { getEmailTemplate, type EmailTemplate } from "@/lib/queries/email-templates";

/**
 * The email that carries a password.
 *
 * Sent twice in an account's life: when it is created, and whenever an owner
 * resets it. One template for both, with a different heading, because they are
 * the same message — here is your password, here is where to use it, change it
 * when you are in.
 *
 * It is deliberately plain. Nobody needs to be sold anything by the email that
 * lets them start work, and a password mail dressed up as marketing is the
 * shape of a phishing message. No tracking, one link, and it says who sent it.
 *
 * The password is in the body because there is nowhere else it can be: nobody,
 * including the owner who pressed the button, can read it back afterwards —
 * Supabase stores only its hash. That is the property being bought and it is
 * why the copy tells the reader to change it and to delete the message.
 *
 * Every word is editable from the admin panel. `FALLBACK` is what sends when
 * the row is missing or deactivated — the guarantee that there is always
 * something to send, not the source of truth.
 */

const TEMPLATE_KEY = "account_credentials";

const FALLBACK: EmailTemplate = {
  key: TEMPLATE_KEY,
  subject: "Your {{company_name}} admin account",
  preheader: "Your sign-in details for the {{company_name}} admin panel.",
  heading: "Your account is ready, {{first_name}}",
  intro:
    "An account has been created for you on the {{company_name}} admin panel. Your sign-in details are below.",
  steps: [
    {
      title: "Sign in",
      body: "Use the address and password below at {{login_url}}.",
    },
    {
      title: "Change the password",
      body: "Open your account screen and set one only you know. The one below was generated and emailed, so treat it as temporary.",
    },
    {
      title: "Delete this email",
      body: "Once you are in, this message has nothing left to offer anyone but a stranger.",
    },
  ],
  button: { label: "Sign in", href: "{{login_url}}" },
  note: "If you were not expecting this, tell {{company_name}} — an account has been opened in your name.",
};

const RESET_FALLBACK: EmailTemplate = {
  ...FALLBACK,
  key: TEMPLATE_KEY,
  subject: "Your {{company_name}} password has been reset",
  preheader: "A new password for the {{company_name}} admin panel.",
  heading: "A new password, {{first_name}}",
  intro:
    "Your password for the {{company_name}} admin panel has been reset. The old one no longer works.",
  note: "If you did not ask for this, tell {{company_name}} straight away — somebody with owner access reset it.",
};

export interface AccountCredentialsData {
  name: string;
  email: string;
  password: string;
  roleLabel: string;
  /** A reset reads differently from a first welcome, and should. */
  reason: "created" | "reset";
}

export async function buildAccountCredentials(
  account: AccountCredentialsData,
  brand: EmailBrand,
): Promise<MailMessage> {
  const firstName = account.name.trim().split(/\s+/)[0] || account.email;
  const loginUrl = `${brand.siteUrl.replace(/\/$/, "")}/admin/login`;

  const stored = await getEmailTemplate(TEMPLATE_KEY);
  const base = stored ?? (account.reason === "reset" ? RESET_FALLBACK : FALLBACK);

  const copy = fillTemplate(base, {
    first_name: firstName,
    name: account.name,
    company_name: brand.companyName,
    legal_name: brand.legalName,
    role: account.roleLabel,
    login_url: loginUrl,
    site_url: brand.siteUrl,
  });

  const rows: Array<[string, string]> = [
    ["Email", account.email],
    ["Password", account.password],
    ["Role", account.roleLabel],
  ];

  const text = [
    `Hi ${firstName},`,
    "",
    copy.intro ?? "",
    "",
    ...rows.map(([label, value]) => `  ${label}: ${value}`),
    "",
    `Sign in at ${loginUrl}`,
    "",
    ...copy.steps.map((step, index) => `  ${index + 1}. ${step.title} — ${step.body}`),
    "",
    copy.note ?? "",
    "",
    brand.companyName,
    brand.siteUrl,
  ]
    .filter((line) => line !== "")
    .join("\n");

  const html = renderEmail({
    preheader: copy.preheader ?? copy.heading,
    heading: copy.heading,
    intro: copy.intro ?? undefined,
    rows,
    steps: copy.steps,
    button: copy.button ?? { label: "Sign in", href: loginUrl },
    note: copy.note ?? undefined,
    brand,
  });

  return {
    to: account.email,
    subject: copy.subject,
    text,
    html,
    replyTo: brand.email ?? undefined,
    attachments: [await logoAttachment()],
  };
}
