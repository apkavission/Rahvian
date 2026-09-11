import { notFound } from "next/navigation";
import { requireMenu } from "@/lib/auth/session";
import {
  getLetter,
  getLetterheadCompany,
  getLetterheadSettings,
  layoutFor,
} from "@/lib/queries/letterhead";
import { readFields } from "@/lib/letterhead-fields";
import { LetterheadSheet } from "@/components/admin/letterhead/sheet";
import { PrintOnLoad } from "../../print-on-load";

type Props = { params: Promise<{ id: string }> };

/**
 * One saved letter, ready to print or to save as a PDF.
 *
 * Reads the letter from the database rather than from a query string, and that
 * is deliberate: a letterhead carries the company's name and its CIN, and a
 * print page that rendered whatever was passed in the URL would let anybody
 * who could reach it produce a letter on company paper saying anything at all.
 * What prints is what was saved.
 */
export default async function PrintLetter({ params }: Props) {
  await requireMenu("letterhead");

  const { id } = await params;

  const [letter, company, settings] = await Promise.all([
    getLetter(id),
    getLetterheadCompany(),
    getLetterheadSettings(),
  ]);

  if (!letter) notFound();

  return (
    <>
      <PrintOnLoad />
      <LetterheadSheet
        company={company}
        options={{
          layout: layoutFor(letter, settings),
          accent: settings?.accent ?? "#0E7C7B",
          logoScale: settings?.logo_scale ?? 100,
          footerNote: settings?.footer_note ?? "",
          fields: readFields(settings?.fields),
        }}
        letter={{
          recipient: letter.recipient,
          reference: letter.reference,
          letterDate: letter.letter_date,
          subject: letter.subject,
          salutation: letter.salutation,
          bodyHtml: letter.body_html,
          signatoryName: letter.signatory_name,
          signatoryRole: letter.signatory_role,
        }}
      />
    </>
  );
}
