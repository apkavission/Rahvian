import "server-only";

import { SITE_URL } from "@/lib/env";
import { getSiteSettings } from "@/lib/queries/site-settings";
import type { EmailBrand } from "@/lib/email/layout";

/**
 * The company details every email footer carries.
 *
 * Read from `site_settings` rather than hardcoded, so changing an address or a
 * phone number updates the website and the outgoing mail together. The
 * fallbacks exist only so a send never fails because settings have not been
 * filled in yet.
 */
export async function getEmailBrand(): Promise<EmailBrand> {
  const settings = await getSiteSettings();

  const addressLines = [
    [settings?.address_line1, settings?.address_line2]
      .filter(Boolean)
      .join(", "),
    [settings?.city, settings?.state, settings?.postal_code]
      .filter(Boolean)
      .join(" "),
  ].filter((line) => line.length > 0);

  return {
    companyName: settings?.company_name ?? "Rahvian",
    legalName: settings?.legal_name ?? null,
    email: settings?.email ?? null,
    phone: settings?.phone ?? null,
    addressLines,
    siteUrl: SITE_URL,
  };
}
