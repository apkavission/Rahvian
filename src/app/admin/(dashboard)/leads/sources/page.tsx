import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, TrendingUp } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { getMarketingSummary, LIMIT, type SourceRow } from "@/lib/queries/marketing";

export const metadata: Metadata = {
  title: "Where enquiries come from",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Which marketing actually produced work.
 *
 * ---------------------------------------------------------------------------
 * **Every number here was already in the database and had never been read.**
 *
 * Enquiries have carried their campaign parameters, the page the form was on
 * and the site that sent them since the table was written. Nothing looked at
 * any of it — so "did that campaign do anything" was answered from memory, and
 * the next campaign was decided the same way as the last.
 *
 * ---------------------------------------------------------------------------
 * **Three numbers per row, not one.**
 *
 * Enquiries alone is the number that misleads: a source producing thirty
 * enquiries and no work is worse than one producing four and winning two, and a
 * table ranked by volume recommends the first. So every row carries how many
 * were answered and how many became work, and the reader can see the difference
 * without doing arithmetic.
 *
 * ---------------------------------------------------------------------------
 * **Spam and archived enquiries are left out**, and the totals say so. A
 * campaign that produced forty pieces of spam did not produce forty enquiries.
 */
export default async function SourcesPage() {
  await requireMenu("leads");

  const summary = await getMarketingSummary();

  if (summary.total === 0) {
    return (
      <div className="space-y-6">
        <Header />
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-text-muted">
          No enquiries yet — nothing to break down. This fills in on its own as
          they arrive.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <Header />

      <dl className="grid gap-3 sm:grid-cols-3">
        <Figure label="Enquiries counted" value={summary.total} />
        <Figure
          label="Came direct"
          value={summary.direct}
          note="No campaign and no referring site — typed, bookmarked, or sent in a message."
        />
        <Figure
          label="Became work"
          value={summary.months.reduce((sum, month) => sum + month.won, 0)}
        />
      </dl>

      {summary.capped && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          There are more than {LIMIT.toLocaleString("en-IN")} enquiries. This
          reads the most recent {LIMIT.toLocaleString("en-IN")}, so everything
          below describes that window rather than all time.
        </p>
      )}

      {summary.months.length > 1 && <Months months={summary.months} />}

      <Table
        title="Campaigns"
        note="From utm_campaign. Only the quote form carries these — the short contact form deliberately does not, so a question asked from a blog post shows under Pages rather than here."
        rows={summary.campaigns}
      />

      <div className="grid gap-8 xl:grid-cols-2">
        <Table title="Sources" note="From utm_source — where you put the link." rows={summary.sources} />
        <Table title="Mediums" note="From utm_medium — what kind of link it was." rows={summary.mediums} />
      </div>

      <Table
        title="Pages the form was on"
        note="Which page was doing the persuading when somebody decided to write in."
        rows={summary.landingPages}
      />

      <Table
        title="Sites that sent them"
        note="The referring domain, without the path. Empty for anybody arriving direct."
        rows={summary.referrers}
      />
    </div>
  );
}

/* ========================================================================== */

function Header() {
  return (
    <header>
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
      >
        <ChevronLeft className="size-4" aria-hidden />
        Enquiries
      </Link>

      <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
        Where enquiries come from
      </h1>
      <p className="measure mt-2 text-sm text-text-muted">
        Counted from the enquiries themselves, not from an analytics account —
        so these are people who actually wrote in, and every row can be checked
        against the enquiries screen. Spam and archived enquiries are left out.
      </p>
    </header>
  );
}

function Figure({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-4 py-3">
      <dd className="font-display text-2xl font-semibold tabular-nums">
        {value.toLocaleString("en-IN")}
      </dd>
      <dt className="mt-0.5 text-xs text-text-subtle">{label}</dt>
      {note && <p className="mt-2 text-[11px] leading-snug text-text-subtle">{note}</p>}
    </div>
  );
}

/**
 * The year, as bars.
 *
 * Drawn with divs rather than a charting library: it is one series of a dozen
 * values, and a dependency that ships a rendering engine to draw twelve
 * rectangles is a dependency that has to be kept up to date for ever.
 */
function Months({ months }: { months: Array<{ month: string; enquiries: number; won: number }> }) {
  const tallest = Math.max(...months.map((month) => month.enquiries), 1);

  return (
    <section>
      <h2 className="font-display text-lg font-semibold">Month by month</h2>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface p-5">
        <ol className="flex min-w-max items-end gap-3">
          {months.map((month) => (
            <li key={month.month} className="flex w-14 shrink-0 flex-col items-center gap-2">
              <span className="text-xs font-medium tabular-nums">{month.enquiries}</span>

              <div
                className="flex w-full flex-col justify-end rounded-md bg-surface-2"
                style={{ height: 120 }}
              >
                <div
                  className="w-full rounded-md bg-accent/25"
                  style={{ height: `${(month.enquiries / tallest) * 100}%` }}
                >
                  {/* The won share, drawn inside the bar rather than beside it:
                      the question is what proportion, not what total. */}
                  <div
                    className="w-full rounded-md bg-accent"
                    style={{
                      height: month.enquiries
                        ? `${(month.won / month.enquiries) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              <span className="text-[11px] text-text-subtle">
                {new Date(`${month.month}-01T00:00:00Z`).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "2-digit",
                  timeZone: "UTC",
                })}
              </span>
            </li>
          ))}
        </ol>

        <p className="mt-4 flex items-center gap-2 text-xs text-text-subtle">
          <TrendingUp className="size-3.5" aria-hidden />
          The solid part of each bar is the enquiries that became work.
        </p>
      </div>
    </section>
  );
}

function Table({ title, note, rows }: { title: string; note: string; rows: SourceRow[] }) {
  return (
    <section>
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="measure mt-1 text-sm text-text-muted">{note}</p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-text-muted">
          Nothing recorded under this yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-surface">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-subtle">
                <th className="px-4 py-3 font-normal">{title.replace(/s$/, "")}</th>
                <th className="px-4 py-3 text-right font-normal">Enquiries</th>
                <th className="px-4 py-3 text-right font-normal">Answered</th>
                <th className="px-4 py-3 text-right font-normal">Became work</th>
                <th className="px-4 py-3 text-right font-normal">Latest</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-border last:border-0">
                  <td className="max-w-[18rem] truncate px-4 py-3 font-medium" title={row.label}>
                    {row.label}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{row.enquiries}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-text-muted">
                    {row.answered}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.won > 0 ? (
                      <span className="font-medium text-accent">{row.won}</span>
                    ) : (
                      <span className="text-text-subtle">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-text-subtle">
                    {row.latest
                      ? new Date(row.latest).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
