import type { Metadata } from "next";
import Link from "next/link";
import { requireMenu } from "@/lib/auth/session";
import { createLetter } from "@/lib/actions/letterhead";
import { getLetterheadCompany, getLetterheadSettings, listLetters } from "@/lib/queries/letterhead";
import { isLayoutKey } from "@/lib/letterhead";
import { readFields } from "@/lib/letterhead-fields";
import { letterPlainText } from "@/lib/letter-html";
import { StationeryForm } from "./stationery-form";

export const metadata: Metadata = {
  title: "Letterhead",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The company's paper, and every letter written on it.
 *
 * ---------------------------------------------------------------------------
 * **Nothing on the letterhead is typed into this screen.** The name, the
 * registered address, the CIN, the phone, the email, the logo and the website
 * all come from `site_settings` — the same row the website's footer reads. That
 * is the whole point of generating a letterhead rather than keeping one in a
 * Word file: there is no second copy of the address to go out of date, and
 * correcting it once corrects the paper too.
 *
 * What this screen decides is the *arrangement*: which blocks appear, in what
 * order, in which part of the page.
 */
export default async function LetterheadPage() {
  await requireMenu("letterhead");

  const [company, settings, letters] = await Promise.all([
    getLetterheadCompany(),
    getLetterheadSettings(),
    listLetters(),
  ]);

  return (
    <div className="mx-auto w-full max-w-[110rem]">
      <header>
        <h1 className="font-display text-2xl font-semibold">Letterhead</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          The company&rsquo;s own paper, and the letters written on it. Every
          detail on the page is read from Settings, so a letterhead cannot say a
          different address from the website.
        </p>
      </header>

      <div className="mt-8">
        <StationeryForm
          company={company}
          initial={{
            layout: isLayoutKey(settings?.layout) ? settings.layout : "classic",
            accent: settings?.accent ?? "#0E7C7B",
            logoScale: settings?.logo_scale ?? 100,
            footerNote: settings?.footer_note ?? "",
            fields: readFields(settings?.fields),
          }}
        />
      </div>

      {/* ---------------------------------------------------------- letters */}

      <section className="mt-14 border-t border-border pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Letters</h2>
            <p className="mt-1 max-w-xl text-sm text-text-muted">
              Written here, kept here, and printed or downloaded whenever they
              are needed again.
            </p>
          </div>

          <form action={createLetter}>
            <button
              type="submit"
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
            >
              Write a letter
            </button>
          </form>
        </div>

        {letters.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border p-10 text-center text-sm text-text-muted">
            No letters yet.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border">
            {letters.map((letter) => {
              const preview = letterPlainText(letter.body_html).slice(0, 120);

              return (
                <li key={letter.id}>
                  <Link
                    href={`/admin/letterhead/${letter.id}`}
                    className="flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-surface p-4 transition-colors hover:bg-surface-2"
                  >
                    <span className="font-medium">{letter.title}</span>

                    <span
                      className={
                        letter.status === "final"
                          ? "rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                          : "rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted"
                      }
                    >
                      {letter.status === "final" ? "Final" : "Draft"}
                    </span>

                    {letter.recipient && (
                      <span className="text-sm text-text-muted">
                        to {letter.recipient.split("\n")[0]}
                      </span>
                    )}

                    <span className="ml-auto text-xs text-text-subtle">
                      {letter.letter_date ?? "no date"}
                    </span>

                    {preview && (
                      <span className="w-full truncate text-xs text-text-subtle">{preview}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
