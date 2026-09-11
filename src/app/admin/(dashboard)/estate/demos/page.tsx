import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Eye, Globe, Lock, X } from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { requireMenu } from "@/lib/auth/session";
import { PAGE_SIZE, requestedPage, resolve, type Query } from "@/lib/pagination";
import { createControlClient } from "@/lib/supabase/control";
import type { DemoLinkRow, DemoOpenRow, DemoVariantRow } from "@/types/control";
import { Unavailable } from "../page";
import { CloseLink, ShareForm, VisibilitySwitch } from "./manage";

export const metadata: Metadata = { title: "Who may open a demo" };

/**
 * Every demo link in the estate, and the switch that decides whether links
 * matter at all.
 *
 * ---------------------------------------------------------------------------
 * **What this screen replaced.** Each demo already had this for itself, behind
 * its own sign-in: six panels to open to answer "what did we send Northside,
 * and did they look at it". So the question was mostly not asked.
 *
 * ---------------------------------------------------------------------------
 * **The first thing on the page is the businesses, not the links.**
 *
 * Until 2026-09-03 all eighteen were `public` — the address alone opened them —
 * which made every link and every expiry date decoration. Somebody could have
 * spent a year issuing careful fortnight-long links to a site the whole world
 * could read. That switch is now the top of this screen, where it is seen,
 * rather than a field inside a variant editor.
 *
 * ---------------------------------------------------------------------------
 * **Dead links stay listed.** The row is the record of who was sent what and
 * how often they opened it, and that is worth more after the link dies than
 * before: "they never opened it" and "they opened it nine times" are different
 * conversations with the same prospect.
 *
 * **The token is not on the page.** It is shown once, when the link is made.
 * A screen that could reveal any token on demand would be a screen that hands
 * over every live demo at once, and it would be the obvious thing to leave open
 * on a laptop in a meeting.
 */
export default async function DemoAccessPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  await requireMenu("estate");

  const query = await searchParams;
  const supabase = await createControlClient();

  const [variants, links] = await Promise.all([
    supabase.rpc("demo_variants"),
    supabase.rpc("demo_links", { p_app_key: null }),
  ]);

  if (variants.error) return <Unavailable message={variants.error.message} />;
  if (links.error) return <Unavailable message={links.error.message} />;

  const businesses = (variants.data ?? []) as DemoVariantRow[];
  const everyLink = (links.data ?? []) as DemoLinkRow[];

  /*
    Filtering here rather than in the database.

    The whole estate is at most a few hundred links, and it is already loaded to
    count the states above the list. A second round trip per filter would buy
    nothing and would make "6 live" and the rows underneath capable of
    disagreeing.
  */
  const only = typeof query.demo === "string" ? query.demo : null;
  const shown = only ? everyLink.filter((link) => link.app_key === only) : everyLink;

  const request = requestedPage(query, PAGE_SIZE);
  const paged = resolve(shown.slice(request.from, request.to + 1), shown.length, request);

  /* One link's openings, when one has been asked for. */
  const openLink =
    typeof query.link === "string"
      ? (everyLink.find((link) => link.link_id === query.link) ?? null)
      : null;

  let opens: DemoOpenRow[] = [];
  if (openLink) {
    const detail = await supabase.rpc("demo_link_opens", {
      p_app_key: openLink.app_key,
      p_link_id: openLink.link_id,
    });
    opens = (detail.data ?? []) as DemoOpenRow[];
  }

  const live = everyLink.filter((link) => link.state === "live").length;
  const openToWorld = businesses.filter((b) => b.visibility === "public").length;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Who may open a demo
        </h1>
        <p className="measure mt-2 text-sm text-text-muted">
          A demo is opened by invitation. Every link names who it was for, stops
          on its own date, can be closed the moment you need it closed, and
          counts every time it is used.
        </p>
      </header>

      <dl className="grid gap-3 sm:grid-cols-3">
        <Figure label="Businesses" value={businesses.length} />
        <Figure label="Links working now" value={live} />
        <Figure
          label="Open to anybody"
          value={openToWorld}
          tone={openToWorld > 0 ? "warn" : "calm"}
        />
      </dl>

      {/* ------------------------------------------------- the businesses */}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">The businesses</h2>
          <p className="measure mt-1 text-sm text-text-muted">
            Closed means the address alone shows the expired screen, and only a
            live link gets in. Open means anybody who knows the address can read
            it — which is right for one portfolio piece and wrong for work built
            for a particular client.
          </p>
        </div>

        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {businesses.map((business) => (
            <li
              key={business.variant_id}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{business.business_name}</p>
                  <p className="mt-0.5 truncate text-xs text-text-subtle">
                    {business.app_name} · /{business.slug}
                  </p>
                </div>

                {business.visibility === "public" ? (
                  <span
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                    title="Anybody with the address can read this"
                  >
                    <Globe className="size-3" aria-hidden />
                    Open
                  </span>
                ) : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-muted">
                    <Lock className="size-3" aria-hidden />
                    By link
                  </span>
                )}
              </div>

              <p className="mt-3 text-xs text-text-subtle">
                {business.live_links === 0
                  ? "No live links"
                  : `${business.live_links} live ${business.live_links === 1 ? "link" : "links"}`}
              </p>

              {/*
                The two doors into this demo, from the screen that decides who
                may open it.

                The owner asked for the second one: *"mene ek link banaya kisi
                demo ka to us demo ka admin chalna chaiye"*. It always did —
                what was missing was a way to get there. This screen already
                knows every demo's address, so not offering its panel was the
                one screen in the estate that talked about a demo and could not
                open the back of it.

                **The panel is not behind the share link**, and that is worth
                knowing rather than discovering: a share link admits a visitor
                to one business's *public* pages. The panel answers to the
                account, so it opens for a colleague with that demo in their
                access list and for nobody else — which is why this pair of
                links is safe to put on a page.
              */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <a
                  href={`${business.base_url}/${business.slug}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  Open the site
                  <ExternalLink className="size-3" aria-hidden />
                </a>

                <a
                  href={`${business.base_url}/admin`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 font-medium text-accent hover:underline"
                >
                  Open its panel
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </div>

              <VisibilitySwitch
                appKey={business.app_key}
                variantId={business.variant_id}
                name={business.business_name}
                isPublic={business.visibility === "public"}
              />
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------- issuing */}

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Send somebody a link</h2>
          <p className="measure mt-1 text-sm text-text-muted">
            The link is shown once, here, as soon as it is made. Copy it before
            leaving the page — after that the record keeps the label and the
            dates, and never the address itself.
          </p>
        </div>

        <ShareForm businesses={businesses} />
      </section>

      {/* ------------------------------------------------ what was sent */}

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Everything sent</h2>
            <p className="mt-1 text-sm text-text-muted">
              Newest first. Closed and expired links stay on the list.
            </p>
          </div>

          <DemoFilter links={everyLink} current={only} />
        </div>

        {paged.rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-sm text-text-muted">
            {only
              ? "Nothing has been sent for this demo yet."
              : "Nothing has been sent yet. Every demo is closed until it is."}
          </p>
        ) : (
          <ul className="space-y-3">
            {paged.rows.map((link) => (
              <LinkRow key={link.link_id} link={link} query={query} />
            ))}
          </ul>
        )}

        <Pagination paged={paged} pathname="/admin/estate/demos" query={query} />
      </section>

      {/* ------------------------------------------------- one by one */}

      {openLink && <Openings link={openLink} opens={opens} query={query} />}
    </div>
  );
}

/* ========================================================================== */

function Figure({
  label,
  value,
  tone = "calm",
}: {
  label: string;
  value: number;
  tone?: "calm" | "warn";
}) {
  return (
    <div
      className={
        tone === "warn"
          ? "rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3"
          : "rounded-xl border border-border bg-surface px-4 py-3"
      }
    >
      <dd className="font-display text-2xl font-semibold tabular-nums">{value}</dd>
      <dt className="mt-0.5 text-xs text-text-subtle">{label}</dt>
    </div>
  );
}

/** The words for each state, in one place, so no two rows disagree. */
const STATE = {
  live: { label: "Working", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  expired: { label: "Expired", className: "bg-surface-2 text-text-muted" },
  revoked: { label: "Closed", className: "bg-surface-2 text-text-muted" },
  used_up: { label: "Used up", className: "bg-surface-2 text-text-muted" },
} as const;

const DAY = { day: "numeric", month: "short", year: "numeric" } as const;
const MOMENT = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
} as const;

function on(value: string | null): string {
  return value ? new Date(value).toLocaleDateString("en-IN", DAY) : "—";
}

function LinkRow({ link, query }: { link: DemoLinkRow; query: Query }) {
  const state = STATE[link.state];
  const dead = link.state !== "live";

  /* Kept alongside the link so opening the detail does not lose the page or the
     demo filter somebody had chosen. */
  const detail = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value] as [string, string]] : [],
    ),
  );
  detail.set("link", link.link_id);

  return (
    <li
      className={`rounded-2xl border p-4 ${dead ? "border-border bg-surface/60" : "border-border bg-surface"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{link.label}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${state.className}`}
            >
              {state.label}
            </span>
          </p>

          <p className="mt-1 text-xs text-text-subtle">
            {link.app_name} · {link.variant_name}
            {" · "}
            {link.state === "revoked"
              ? `closed ${on(link.revoked_at)}`
              : `${link.state === "expired" ? "expired" : "works until"} ${on(link.expires_at)}`}
            {link.max_views !== null && ` · at most ${link.max_views} openings`}
          </p>

          {link.note && (
            <p className="measure mt-2 text-xs text-text-muted">{link.note}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/admin/estate/demos?${detail.toString()}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface-2"
          >
            <Eye className="size-3.5" aria-hidden />
            Opened {link.view_count} {link.view_count === 1 ? "time" : "times"}
          </Link>

          {link.state === "live" && (
            <CloseLink appKey={link.app_key} linkId={link.link_id} label={link.label} />
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Every opening of one link.
 *
 * The count answers "how many". This answers when, and from what — which is the
 * question actually asked when a client says they never received it.
 */
function Openings({
  link,
  opens,
  query,
}: {
  link: DemoLinkRow;
  opens: DemoOpenRow[];
  query: Query;
}) {
  const back = new URLSearchParams(
    Object.entries(query).flatMap(([key, value]) =>
      typeof value === "string" && key !== "link" ? [[key, value] as [string, string]] : [],
    ),
  );

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">{link.label}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {link.app_name} · {link.variant_name} · made {on(link.created_at)}
          </p>
        </div>

        <Link
          href={`/admin/estate/demos${back.size ? `?${back.toString()}` : ""}`}
          aria-label="Close this record"
          className="rounded-lg border border-border p-1.5 transition-colors hover:bg-surface-2"
        >
          <X className="size-4" aria-hidden />
        </Link>
      </div>

      {opens.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-sm text-text-muted">
          Not opened yet.{" "}
          {link.state === "live"
            ? "The link is working — it has not been used."
            : "It was never opened before it stopped working."}
        </p>
      ) : (
        <ol className="space-y-2">
          {opens.map((open) => (
            <li
              key={open.opened_at}
              className="rounded-xl bg-surface-2 px-4 py-3 text-sm"
            >
              <p className="font-medium tabular-nums">
                {new Date(open.opened_at).toLocaleString("en-IN", MOMENT)}
              </p>

              <p className="mt-1 break-words text-xs text-text-subtle">
                {describeBrowser(open.user_agent)}
                {open.referrer && ` · came from ${open.referrer}`}
              </p>
            </li>
          ))}
        </ol>
      )}

      <p className="text-xs text-text-subtle">
        A browser and where they came from, and nothing else — no address, and
        nothing that follows a person between visits. Several pages read in one
        sitting count as one opening.
      </p>
    </section>
  );
}

/**
 * A browser, in words.
 *
 * A raw user-agent string is unreadable and takes three lines. This says what
 * somebody actually wants — phone or computer, which browser — and admits it
 * when the string says nothing useful, rather than guessing.
 */
function describeBrowser(agent: string | null): string {
  if (!agent) return "An unknown browser";

  const phone = /iPhone|iPad|Android|Mobile/i.test(agent);
  const name =
    /Edg\//.test(agent) ? "Edge"
    : /OPR\//.test(agent) ? "Opera"
    : /Firefox\//.test(agent) ? "Firefox"
    : /Chrome\//.test(agent) ? "Chrome"
    : /Safari\//.test(agent) ? "Safari"
    : null;

  if (!name) return phone ? "A phone or tablet" : "An unrecognised browser";

  return `${name} on ${phone ? "a phone or tablet" : "a computer"}`;
}

/** One demo, or all of them. Links rather than a select: every view is an address. */
function DemoFilter({ links, current }: { links: DemoLinkRow[]; current: string | null }) {
  const demos = [...new Map(links.map((l) => [l.app_key, l.app_name])).entries()];

  if (demos.length < 2) return null;

  return (
    <nav aria-label="Filter by demo" className="flex flex-wrap gap-1.5">
      <Chip href="/admin/estate/demos" active={current === null}>
        All
      </Chip>

      {demos.map(([key, name]) => (
        <Chip
          key={key}
          href={`/admin/estate/demos?demo=${encodeURIComponent(key)}`}
          active={current === key}
        >
          {name.replace(/ demo$/, "")}
        </Chip>
      ))}
    </nav>
  );
}

function Chip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg"
          : "rounded-full border border-border px-3 py-1 text-xs transition-colors hover:bg-surface-2"
      }
    >
      {children}
    </Link>
  );
}
