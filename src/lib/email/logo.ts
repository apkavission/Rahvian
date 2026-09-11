import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getBrandLogos } from "@/lib/queries/brand";

/**
 * The logo, resolved for email.
 *
 * Follows whatever is configured in `site_settings.logo_dark_id`, so changing
 * the logo in the admin panel changes it in every email without a deploy. The
 * *dark* variant is the one wanted here: it carries light ink, and the email
 * header is a fixed dark bar.
 *
 * Two conversions are unavoidable. Mail clients do not render SVG — Gmail
 * strips it outright — so a vector logo has to be rasterised. And the result is
 * attached rather than linked, so it appears before the reader clicks "show
 * images" and works before the site is deployed anywhere public.
 *
 * The rendered PNG is memoised for the life of the process. It changes only
 * when someone edits settings, and rasterising a vector on every send would be
 * work repeated for no reason.
 */

const EMAIL_LOGO_WIDTH = 440;
const FALLBACK_PATH = join(process.cwd(), "public", "brand", "logo-email.png");

let cached: { source: string; png: Buffer } | undefined;

export interface EmailLogo {
  png: Buffer;
  filename: string;
}

export async function resolveEmailLogo(): Promise<EmailLogo> {
  const source = await resolveSourcePath();

  if (cached?.source === source) {
    return { png: cached.png, filename: "logo.png" };
  }

  try {
    const input = await readFile(source);
    const png = await sharp(input, { density: 400 })
      .trim({ threshold: 5 })
      .resize({ width: EMAIL_LOGO_WIDTH })
      .png({ compressionLevel: 9 })
      .toBuffer();

    cached = { source, png };
    return { png, filename: "logo.png" };
  } catch (error) {
    // A logo that will not render must not stop the email. Falling back to the
    // committed PNG keeps the message branded rather than sending it bare.
    console.error(
      `[email] could not render logo from ${source}:`,
      error instanceof Error ? error.message : error,
    );

    const png = await readFile(FALLBACK_PATH);
    return { png, filename: "logo.png" };
  }
}

/**
 * Where the configured logo actually lives on disk.
 *
 * `media.public_url` is a site-root path (`/brand/logo-dark.png`) while the
 * media library is served from `public/`. Once uploads move to R2 those become
 * absolute URLs, and this is the one place that has to learn to fetch them.
 */
async function resolveSourcePath(): Promise<string> {
  const logos = await getBrandLogos();
  const url = logos.dark?.url;

  if (!url || /^https?:\/\//.test(url)) {
    // Remote assets are not fetched yet; the committed PNG stands in.
    return FALLBACK_PATH;
  }

  return join(process.cwd(), "public", url.replace(/^\//, ""));
}
