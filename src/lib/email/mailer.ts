import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { getServerEnv } from "@/lib/env";

/**
 * Outbound mail over our own SMTP server.
 *
 * Deliberately not a third-party sending API. The only thing this needs is
 * SMTP credentials for a mailbox on a domain we control, which means no
 * per-message cost, no vendor holding the lead data, and no second place to
 * revoke access when someone leaves.
 *
 * Two rules shape the design:
 *
 *   Sending never throws. A lead is saved to the database before any mail is
 *   attempted, so a refused connection or a wrong password must not turn a
 *   captured lead into an error page for the person who submitted it. Failures
 *   come back as a result value and are logged.
 *
 *   Unconfigured is a valid state. In development SMTP_HOST is blank, and the
 *   message is logged rather than sent. This keeps the whole form testable
 *   without credentials.
 */

/**
 * A file carried with the message.
 *
 * `cid` makes it an inline part the HTML can reference as `src="cid:the-id"`.
 * Embedding the logo this way rather than linking it means it renders even
 * before the reader clicks "show images", and it keeps working when the site
 * is behind a firewall or has not been deployed yet.
 */
export interface MailAttachment {
  filename: string;
  /** In-memory bytes. Preferred, so the sender never depends on a path. */
  content?: Buffer;
  /** A file on disk, when reading it lazily is simpler. */
  path?: string;
  cid?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  /** Where a human reply should go. Set to the lead's address on notifications. */
  replyTo?: string;
  attachments?: MailAttachment[];
}

export type MailResult =
  | { sent: true }
  | { sent: false; reason: "not-configured" | "failed"; error?: string };

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

/**
 * Returns the SMTP settings only when every required piece is present.
 *
 * Partial configuration is treated as no configuration on purpose. A host with
 * no password fails at connection time with a message that reads like a bug;
 * catching it here produces one clear "not configured" line instead.
 */
function readSmtpConfig(): SmtpConfig | null {
  const env = getServerEnv();

  if (
    !env.SMTP_HOST ||
    !env.SMTP_USER ||
    !env.SMTP_PASS ||
    !env.EMAIL_FROM
  ) {
    return null;
  }

  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    user: env.SMTP_USER,
    password: env.SMTP_PASS,
    from: env.EMAIL_FROM,
  };
}

export function isMailConfigured(): boolean {
  return readSmtpConfig() !== null;
}

/** Where lead notifications are sent, or null if no recipient is configured. */
export function getAdminRecipient(): string | null {
  return getServerEnv().EMAIL_TO_ADMIN ?? null;
}

// One pooled transport per process. Node reuses the TCP connection across
// messages, which matters because most SMTP providers rate-limit connections
// far more aggressively than they rate-limit messages.
let transporter: Transporter | undefined;

function getTransporter(config: SmtpConfig): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: { user: config.user, pass: config.password },
      pool: true,
      maxConnections: 3,
    });
  }
  return transporter;
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = readSmtpConfig();

  if (!config) {
    console.info(
      `[mail] SMTP not configured — message not sent.\n` +
        `       to:      ${message.to}\n` +
        `       subject: ${message.subject}`,
    );
    return { sent: false, reason: "not-configured" };
  }

  try {
    await getTransporter(config).sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
      attachments: message.attachments,
    });
    return { sent: true };
  } catch (error) {
    // Logged rather than rethrown: the caller has already committed the lead
    // and cannot undo it, so the only useful outcome is a record of the failure.
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`[mail] send failed for "${message.subject}": ${detail}`);
    return { sent: false, reason: "failed", error: detail };
  }
}
