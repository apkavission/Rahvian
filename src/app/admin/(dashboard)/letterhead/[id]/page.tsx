import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMenu } from "@/lib/auth/session";
import { getLetter, getLetterheadCompany, getLetterheadSettings, layoutFor } from "@/lib/queries/letterhead";
import { readFields } from "@/lib/letterhead-fields";
import { LetterForm } from "./letter-form";

export const metadata: Metadata = {
  title: "Letter",
  robots: { index: false, follow: false, nocache: true },
};

type Props = { params: Promise<{ id: string }> };

/** One letter, on the company's paper. */
export default async function LetterPage({ params }: Props) {
  await requireMenu("letterhead");

  const { id } = await params;

  const [letter, company, settings] = await Promise.all([
    getLetter(id),
    getLetterheadCompany(),
    getLetterheadSettings(),
  ]);

  /* A letter that is not there, or one this account may not read — row
     security answers both the same way, and so does this. */
  if (!letter) notFound();

  return (
    <div className="mx-auto w-full max-w-[110rem]">
      <header>
        <Link href="/admin/letterhead" className="text-sm text-accent hover:underline">
          ← Letterhead
        </Link>
        <h1 className="mt-2 font-display text-2xl font-semibold">{letter.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          The header and the foot come from the company&rsquo;s letterhead. What
          is written here is the letter.
        </p>
      </header>

      <div className="mt-8">
        <LetterForm
          company={company}
          companyLayout={layoutFor(null, settings)}
          accent={settings?.accent ?? "#0E7C7B"}
          logoScale={settings?.logo_scale ?? 100}
          footerNote={settings?.footer_note ?? ""}
          fields={readFields(settings?.fields)}
          initial={{
            id: letter.id,
            title: letter.title,
            recipient: letter.recipient,
            reference: letter.reference,
            letterDate: letter.letter_date ?? "",
            subject: letter.subject,
            salutation: letter.salutation,
            bodyHtml: letter.body_html,
            signatoryName: letter.signatory_name,
            signatoryRole: letter.signatory_role,
            layout: (letter.layout as "classic" | "centred" | "band" | "minimal" | null) ?? "",
            status: letter.status === "final" ? "final" : "draft",
          }}
        />
      </div>
    </div>
  );
}
