"use client";

import { useActionState, useRef, useState } from "react";
import { deleteLetter, saveLetter } from "@/lib/actions/letterhead";
import { idleLetterState } from "@/lib/letter-state";
import { estimateLines } from "@/lib/letter-html";
import { LAYOUTS, MARGIN, PAGE, type LayoutKey, type LetterheadCompany } from "@/lib/letterhead";
import type { LetterheadField } from "@/lib/letterhead-fields";
import { LetterheadSheet, SheetPreview } from "@/components/admin/letterhead/sheet";
import { RichText } from "@/components/admin/letterhead/rich-text";
import { FIELD, LABEL } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/**
 * One letter, written on the company's paper.
 *
 * ---------------------------------------------------------------------------
 * **The preview is the page.** The same `LetterheadSheet` that prints is drawn
 * beside the form at 52%, updating as the letter is typed — so nobody has to
 * print to find out that the signature block fell onto a second page.
 *
 * ---------------------------------------------------------------------------
 * **Three ways out, because a letter leaves this screen three ways.**
 *
 *   **Print or save as PDF** — the bare print route, which carries nothing but
 *   the sheet and opens the browser's own dialogue. That dialogue is also where
 *   "Save as PDF" lives, which is the download.
 *
 *   **Download as Word** — the sheet serialised into a `.doc`. A letter often
 *   has to be edited by somebody who does not have the panel, and a PDF cannot
 *   be. Word opens HTML with this content type and keeps the layout.
 *
 *   **Save** — into the database, so the letter can be found and reprinted in a
 *   year, which a downloaded file on somebody's laptop cannot.
 */

export interface LetterFormValues {
  id: string;
  title: string;
  recipient: string;
  reference: string;
  letterDate: string;
  subject: string;
  salutation: string;
  bodyHtml: string;
  signatoryName: string;
  signatoryRole: string;
  layout: LayoutKey | "";
  status: "draft" | "final";
}

export function LetterForm({
  company,
  companyLayout,
  accent,
  logoScale,
  footerNote,
  fields,
  initial,
}: {
  company: LetterheadCompany;
  companyLayout: LayoutKey;
  accent: string;
  logoScale: number;
  footerNote: string;
  fields: LetterheadField[];
  initial: LetterFormValues;
}) {
  const [state, action, pending] = useActionState(saveLetter, idleLetterState);
  const sheet = useRef<HTMLDivElement>(null);

  const [values, setValues] = useState(initial);
  const [bodyHtml, setBodyHtml] = useState(initial.bodyHtml);

  const set = <K extends keyof LetterFormValues>(key: K, value: LetterFormValues[K]) =>
    setValues((was) => ({ ...was, [key]: value }));

  const layout = values.layout === "" ? companyLayout : values.layout;

  /*
    Whether this is going to be one page.

    Estimated from the body's lines against the writable height — 227mm at
    about 4.4mm a line. Not exact, and it does not claim to be: it exists so
    "this will run onto a second page" is known before twelve copies are
    printed and the signature is alone on page two.
  */
  const writableLines = Math.floor((PAGE.height - MARGIN.bodyTop - MARGIN.bottom) / 4.4);
  const usedLines = estimateLines(bodyHtml) + (values.recipient ? 4 : 0) + 8;
  const overflowing = usedLines > writableLines;

  /** The sheet as a file Word will open and let somebody edit. */
  const downloadWord = () => {
    const markup = sheet.current?.innerHTML;
    if (!markup) return;

    /*
      A full document rather than a fragment: Word needs the charset declared
      or every rupee sign and en dash arrives as mojibake, and it needs the
      page size or it opens the letter on US Letter.
    */
    const file = [
      "<html xmlns:o='urn:schemas-microsoft-com:office:office' ",
      "xmlns:w='urn:schemas-microsoft-com:office:word'>",
      "<head><meta charset='utf-8'>",
      "<style>@page { size: A4; margin: 0; }</style>",
      "</head><body>",
      markup,
      "</body></html>",
    ].join("");

    const url = URL.createObjectURL(new Blob([file], { type: "application/msword" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(values.title || "letter").replace(/[^\w\d-]+/g, "-").toLowerCase()}.doc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_auto]">
      <form action={action} className="space-y-6">
        <input type="hidden" name="id" value={values.id} />
        <input type="hidden" name="status" value={values.status} />

        <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div>
            <label className={LABEL} htmlFor="title">
              What to call it here
            </label>
            <input
              id="title"
              name="title"
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              required
              maxLength={160}
              className={cn(FIELD, "mt-1.5")}
            />
            <p className="mt-1 text-xs text-text-subtle">
              For the list. Not printed on the letter.
            </p>
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {state.fieldErrors.title}
              </p>
            )}
          </div>

          <div>
            <label className={LABEL} htmlFor="letter_date">
              Date on the letter
            </label>
            <input
              id="letter_date"
              name="letter_date"
              type="date"
              value={values.letterDate}
              onChange={(event) => set("letterDate", event.target.value)}
              className={cn(FIELD, "mt-1.5")}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="reference">
              Reference
            </label>
            <input
              id="reference"
              name="reference"
              value={values.reference}
              onChange={(event) => set("reference", event.target.value)}
              maxLength={80}
              placeholder="Ref: RT/2026/014"
              className={cn(FIELD, "mt-1.5")}
            />
            <p className="mt-1 text-xs text-text-subtle">
              The number a reply quotes back. Empty prints nothing.
            </p>
          </div>

          <div>
            <label className={LABEL} htmlFor="layout">
              Arrangement
            </label>
            <select
              id="layout"
              name="layout"
              value={values.layout}
              onChange={(event) => set("layout", event.target.value as LayoutKey | "")}
              className={cn(FIELD, "mt-1.5")}
            >
              <option value="">The company&rsquo;s letterhead</option>
              {LAYOUTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label} — just this letter
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={LABEL} htmlFor="recipient">
            Who it is to
          </label>
          <textarea
            id="recipient"
            name="recipient"
            value={values.recipient}
            onChange={(event) => set("recipient", event.target.value)}
            rows={4}
            maxLength={400}
            placeholder={"The Manager\nState Bank of India\nFraser Road Branch\nPatna"}
            className={cn(FIELD, "mt-1.5")}
          />
          <p className="mt-1 text-xs text-text-subtle">
            One line each, as it would be written on an envelope.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="subject">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              value={values.subject}
              onChange={(event) => set("subject", event.target.value)}
              maxLength={200}
              className={cn(FIELD, "mt-1.5")}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="salutation">
              Salutation
            </label>
            <input
              id="salutation"
              name="salutation"
              value={values.salutation}
              onChange={(event) => set("salutation", event.target.value)}
              maxLength={120}
              className={cn(FIELD, "mt-1.5")}
            />
          </div>
        </div>

        {/* ---------------------------------------------------------- the body */}

        <div>
          <span className={LABEL}>The letter</span>
          <div className="mt-1.5">
            <RichText
              name="body_html"
              initialHtml={initial.bodyHtml}
              ariaLabel="The letter"
              onChangeHtml={setBodyHtml}
            />
          </div>

          {overflowing && (
            <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              This is longer than one page. It will still print — the second
              sheet carries the footer but not the header, which is how a
              continuation sheet is supposed to look.
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className={LABEL} htmlFor="signatory_name">
              Signed by
            </label>
            <input
              id="signatory_name"
              name="signatory_name"
              value={values.signatoryName}
              onChange={(event) => set("signatoryName", event.target.value)}
              maxLength={120}
              className={cn(FIELD, "mt-1.5")}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="signatory_role">
              Their designation
            </label>
            <input
              id="signatory_role"
              name="signatory_role"
              value={values.signatoryRole}
              onChange={(event) => set("signatoryRole", event.target.value)}
              maxLength={160}
              className={cn(FIELD, "mt-1.5")}
            />
            <p className="mt-1 text-xs text-text-subtle">
              Both empty leaves out the signature block entirely.
            </p>
          </div>
        </div>

        {/* --------------------------------------------------------- the doing */}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Saving" : "Save"}
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.status === "final"}
              onChange={(event) => set("status", event.target.checked ? "final" : "draft")}
              className="size-4 rounded border-border"
            />
            Mark as final
          </label>

          <a
            href={`/admin/print/letter/${values.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            Print or save as PDF
          </a>

          <button
            type="button"
            onClick={downloadWord}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            Download as Word
          </button>

          {state.status !== "idle" && !pending && (
            <span
              role="status"
              className={cn(
                "text-sm",
                state.status === "error" ? "text-red-600 dark:text-red-400" : "text-text-muted",
              )}
            >
              {state.message}
            </span>
          )}
        </div>

        <p className="text-xs text-text-subtle">
          Print and Word both use what was last <strong>saved</strong>, so save
          before either.
        </p>
      </form>

      {/* ------------------------------------------------------- the preview */}

      <div className="xl:sticky xl:top-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-subtle">
          A4, at 52%
        </p>

        {/* The ref is on the wrapper so "Download as Word" can serialise
            exactly what is drawn, including the sheet's own stylesheet. */}
        <div ref={sheet}>
          <SheetPreview scale={0.52}>
            <LetterheadSheet
              company={company}
              options={{ layout, accent, logoScale, footerNote, fields }}
              letter={{
                recipient: values.recipient,
                reference: values.reference,
                letterDate: values.letterDate || null,
                subject: values.subject,
                salutation: values.salutation,
                bodyHtml,
                signatoryName: values.signatoryName,
                signatoryRole: values.signatoryRole,
              }}
            />
          </SheetPreview>
        </div>

        <form action={deleteLetter} className="mt-4">
          <input type="hidden" name="id" value={values.id} />
          <button
            type="submit"
            className="text-xs text-text-subtle underline transition-colors hover:text-red-600 dark:hover:text-red-400"
          >
            Delete this letter
          </button>
        </form>
      </div>
    </div>
  );
}
