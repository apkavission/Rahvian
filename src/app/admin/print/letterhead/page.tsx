import { requireMenu } from "@/lib/auth/session";
import { getLetterheadCompany, getLetterheadSettings, layoutFor } from "@/lib/queries/letterhead";
import { readFields } from "@/lib/letterhead-fields";
import { LetterheadSheet } from "@/components/admin/letterhead/sheet";
import { PrintOnLoad } from "../print-on-load";

/**
 * The blank sheet — the stationery with no letter on it.
 *
 * What somebody wants when they are about to write by hand, print a stack for
 * the office, or send the letterhead to a printer as a PDF. The writing-area
 * guide is drawn on screen and dropped by the print stylesheet, so the file
 * that comes out is clean paper.
 *
 * Guarded like every other letterhead screen: the company's own stationery is
 * not something an editor should be able to fetch by guessing a URL.
 */
export default async function PrintBlankLetterhead() {
  await requireMenu("letterhead");

  const [company, settings] = await Promise.all([
    getLetterheadCompany(),
    getLetterheadSettings(),
  ]);

  return (
    <>
      <PrintOnLoad />
      <LetterheadSheet
        company={company}
        options={{
          layout: layoutFor(null, settings),
          accent: settings?.accent ?? "#0E7C7B",
          logoScale: settings?.logo_scale ?? 100,
          footerNote: settings?.footer_note ?? "",
          fields: readFields(settings?.fields),
        }}
        blank
      />
    </>
  );
}
