import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  getContentCounts,
  getLeadCounts,
  getRecentLeads,
  getSeoGaps,
} from "@/lib/queries/admin-dashboard";
import { canManageLeads, requireStaff } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

/**
 * The dashboard.
 *
 * What it shows is decided by role, not hidden by CSS: an editor never sees
 * lead figures because the panel is never rendered for them, and the row
 * policies would return nothing even if it were. Two layers saying the same
 * thing, which is the pattern throughout this admin.
 *
 * The counters are honest about an empty database. A new company has no leads
 * and no portfolio, and a dashboard that reads "0" plainly is more useful than
 * one padded with sample figures.
 */
export default async function AdminDashboard() {
  const { profile, email } = await requireStaff();
  const showLeads = canManageLeads(profile);

  const [content, leads, recent, gaps] = await Promise.all([
    getContentCounts(),
    showLeads ? getLeadCounts() : Promise.resolve(null),
    showLeads ? getRecentLeads() : Promise.resolve([]),
    getSeoGaps(),
  ]);

  const firstName = (profile.full_name || email || "").split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header>
        <h1 className="font-display text-2xl font-semibold">
          {firstName ? `Hello, ${firstName}` : "Dashboard"}
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Everything on the public site is a row in here. Nothing needs a developer.
        </p>
      </header>

      {leads && (
        <section className="mt-10" aria-labelledby="leads-heading">
          <h2 id="leads-heading" className="font-display text-lg font-semibold">
            Enquiries
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <Stat label="New" value={leads.new} emphasis />
            <Stat label="Last 7 days" value={leads.thisWeek} />
            <Stat label="All time" value={leads.total} />
          </dl>
        </section>
      )}

      <section className="mt-10" aria-labelledby="content-heading">
        <h2 id="content-heading" className="font-display text-lg font-semibold">
          Content
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Pages" value={content.pages} />
          <Stat label="Services" value={content.services} />
          <Stat label="Pricing plans" value={content.pricingPlans} />
          <Stat label="FAQs" value={content.faqs} />
          <Stat label="Portfolio" value={content.projects} />
          <Stat label="Case studies" value={content.caseStudies} />
          <Stat label="Blog posts" value={content.posts} />
          <Stat label="Team" value={content.team} />
          <Stat label="Media" value={content.media} />
        </dl>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {leads && (
          <section
            className="surface-raised rounded-2xl border border-border p-6"
            aria-labelledby="recent-heading"
          >
            <h2 id="recent-heading" className="font-display text-base font-semibold">
              Latest enquiries
            </h2>

            {recent.length > 0 ? (
              <ul className="mt-5 divide-y divide-border">
                {recent.map((lead) => (
                  <li key={lead.id} className="flex items-start gap-4 py-3 first:pt-0">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{lead.name}</p>
                      <p className="truncate text-xs text-text-subtle">
                        {[lead.company_name, lead.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-accent">
                        {lead.status.replace(/_/g, " ")}
                      </p>
                      <p className="mt-1 text-xs text-text-subtle">
                        {formatDate(lead.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-5 text-sm leading-relaxed text-text-muted">
                No enquiries yet. Both public forms write here the moment one
                arrives, and the notification goes out at the same time.
              </p>
            )}
          </section>
        )}

        <section
          className="surface-raised rounded-2xl border border-border p-6"
          aria-labelledby="gaps-heading"
        >
          <h2 id="gaps-heading" className="font-display text-base font-semibold">
            Needs a meta description
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            Published pages with no description. Search engines write their own
            when one is missing, usually out of the first sentence they find.
          </p>

          {gaps.length > 0 ? (
            <ul className="mt-5 divide-y divide-border">
              {gaps.map((gap) => (
                <li key={`${gap.kind}-${gap.title}`} className="py-3 first:pt-0">
                  <Link
                    href={gap.href}
                    className="group flex items-center gap-3 text-sm"
                  >
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
                      {gap.kind}
                    </span>
                    <span className="min-w-0 flex-1 truncate group-hover:text-accent">
                      {gap.title}
                    </span>
                    <ArrowUpRight
                      className="size-3.5 shrink-0 text-text-subtle transition-colors group-hover:text-accent"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-5 text-sm text-text-muted">
              Nothing missing. Every published page describes itself.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div className="surface-raised rounded-2xl border border-border p-5">
      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-text-subtle">
        {label}
      </dt>
      <dd
        className={
          emphasis && value > 0
            ? "mt-3 font-display text-3xl font-semibold text-accent"
            : "mt-3 font-display text-3xl font-semibold"
        }
      >
        {value}
      </dd>
    </div>
  );
}
