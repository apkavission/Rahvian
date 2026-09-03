import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Where enquiries actually come from.
 *
 * ---------------------------------------------------------------------------
 * **All of this was already being recorded and none of it was ever read.**
 *
 * `leads` has carried `utm`, `referrer` and `source_page` since it was written.
 * The quote form fills them in, and then nothing anywhere looked at them — so
 * the honest answer to "did that campaign do anything" was a shrug, and the
 * next campaign was decided the same way as the last one.
 *
 * ---------------------------------------------------------------------------
 * **Counted here, not in the database, and that is a deliberate limit.**
 *
 * A dozen `group by` functions would be faster and would be the right answer at
 * fifty thousand enquiries. At the number a services company actually receives,
 * one read of the columns that matter and a fold in memory is a single round
 * trip that produces every breakdown at once — and, more usefully, breakdowns
 * that cannot disagree with each other because they are folded from the same
 * rows.
 *
 * The cap is stated rather than hidden: `LIMIT` below is what this can answer
 * over, and the screen says so when it is reached.
 *
 * ---------------------------------------------------------------------------
 * **Spam and archived rows are left out**, because the question is where real
 * enquiries come from. A campaign that produced forty pieces of spam did not
 * produce forty enquiries, and counting them would make the worst source look
 * like the best one.
 */

/** How many enquiries this can look across. Stated on the screen when hit. */
export const LIMIT = 5000;

export interface SourceRow {
  /** The value itself — a campaign name, a domain, a path. */
  key: string;
  /** What to call it on screen when the value is empty. */
  label: string;
  enquiries: number;
  /** Of those, how many are not still sitting in "new". */
  answered: number;
  /** How many became work. */
  won: number;
  /** The most recent one, so a dead source is visibly dead. */
  latest: string | null;
}

export interface MarketingSummary {
  /** Every enquiry counted, after spam and archived are removed. */
  total: number;
  /** True when there are more enquiries than this can look across. */
  capped: boolean;
  /** How many arrived with no campaign parameters at all. */
  direct: number;

  campaigns: SourceRow[];
  sources: SourceRow[];
  mediums: SourceRow[];
  /** The page the form was on. */
  landingPages: SourceRow[];
  /** The site that sent them, by domain. */
  referrers: SourceRow[];
  /** Enquiries per month, oldest first, for the shape of the year. */
  months: Array<{ month: string; enquiries: number; won: number }>;
}

type Row = {
  status: string | null;
  source_page: string | null;
  referrer: string | null;
  utm: Record<string, unknown> | null;
  created_at: string;
};

/**
 * The statuses that mean somebody has done something about it.
 *
 * Read from the row rather than assumed: what matters is "not still new", which
 * survives a status being renamed in a way that a list of the good ones would
 * not.
 */
function isAnswered(status: string | null): boolean {
  return status !== null && status !== "new";
}

function isWon(status: string | null): boolean {
  return status === "won";
}

/** The site that sent them, without the path — `google.com`, not the query. */
function domainOf(referrer: string | null): string | null {
  if (!referrer?.trim()) return null;

  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    /* Not a URL. Kept as typed rather than dropped: a referrer that is not a
       URL is still evidence, and hiding it would make the total not add up. */
    return referrer.trim().slice(0, 80);
  }
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/**
 * Fold rows into one breakdown.
 *
 * `pick` returns the value to group by, or null for "this row does not say".
 * Rows that do not say are counted in the caller's own total rather than under
 * a made-up label, so the numbers under a heading always add up to fewer than
 * the total and never to more.
 */
function fold(rows: Row[], pick: (row: Row) => string | null, empty: string): SourceRow[] {
  const found = new Map<string, SourceRow>();

  for (const row of rows) {
    const key = pick(row);
    if (key === null) continue;

    const existing = found.get(key) ?? {
      key,
      label: key || empty,
      enquiries: 0,
      answered: 0,
      won: 0,
      latest: null,
    };

    existing.enquiries += 1;
    if (isAnswered(row.status)) existing.answered += 1;
    if (isWon(row.status)) existing.won += 1;
    if (!existing.latest || row.created_at > existing.latest) existing.latest = row.created_at;

    found.set(key, existing);
  }

  /* Most enquiries first, and the tie broken by the most recent — so two
     campaigns with three each are not ordered by whichever the database
     happened to return first. */
  return [...found.values()].sort(
    (a, b) => b.enquiries - a.enquiries || (b.latest ?? "").localeCompare(a.latest ?? ""),
  );
}

export async function getMarketingSummary(): Promise<MarketingSummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leads")
    .select("status, source_page, referrer, utm, created_at")
    .eq("is_spam", false)
    .is("archived_at", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) {
    /*
      An empty summary rather than a thrown error.

      Nothing on this screen is load-bearing — it is a view onto enquiries that
      are all still there on the enquiries screen. A failed read should say
      "nothing to show" rather than take the panel down.
    */
    console.error("[marketing] could not read enquiries:", error.message);

    return {
      total: 0,
      capped: false,
      direct: 0,
      campaigns: [],
      sources: [],
      mediums: [],
      landingPages: [],
      referrers: [],
      months: [],
    };
  }

  const rows = (data ?? []) as Row[];

  const utmOf = (row: Row, key: string) => text(row.utm?.[key]);

  /* An enquiry with no campaign parameters and no referrer came from somebody
     typing the address, a bookmark, or a link in a message — all of which is
     "direct" and none of which is a gap in the recording. */
  const direct = rows.filter(
    (row) =>
      !utmOf(row, "utm_source") && !utmOf(row, "utm_campaign") && !domainOf(row.referrer),
  ).length;

  const months = new Map<string, { month: string; enquiries: number; won: number }>();

  for (const row of rows) {
    const month = row.created_at.slice(0, 7);
    const existing = months.get(month) ?? { month, enquiries: 0, won: 0 };

    existing.enquiries += 1;
    if (isWon(row.status)) existing.won += 1;

    months.set(month, existing);
  }

  return {
    total: rows.length,
    capped: rows.length === LIMIT,
    direct,

    campaigns: fold(rows, (row) => utmOf(row, "utm_campaign"), "Unnamed campaign"),
    sources: fold(rows, (row) => utmOf(row, "utm_source"), "Unnamed source"),
    mediums: fold(rows, (row) => utmOf(row, "utm_medium"), "Unnamed medium"),
    landingPages: fold(rows, (row) => text(row.source_page), "Unknown page"),
    referrers: fold(rows, (row) => domainOf(row.referrer), "Unknown site"),

    /* Oldest first: a year reads left to right. */
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}
