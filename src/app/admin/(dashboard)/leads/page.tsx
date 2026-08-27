import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight, Download } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { requireMenu } from "@/lib/auth/session";
import {
  getAssignableStaff,
  getLeads,
  getLeadViewCounts,
  LEADS_PER_PAGE,
} from "@/lib/queries/leads";
import { isLeadStatus, type LeadFilters } from "@/lib/validation/leads";
import { formatDate } from "@/lib/utils";
import { LeadFilterBar } from "./filter-bar";

export const metadata: Metadata = {
  title: "Enquiries",
  robots: { index: false, follow: false, nocache: true },
};

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The enquiry list.
 *
 * Filters live in the query string, so a filtered view is a link — bookmarkable,
 * sendable, and reachable with the back button.
 *
 * Editors never arrive here: the menu does not offer it, this page answers them
 * with a 404, and `can_manage_leads()` returns nothing to them at the database.
 * Access to content must not imply access to commercial data.
 */
export default async function LeadsPage({ searchParams }: Search) {
  await requireMenu("leads");

  const params = await searchParams;
  const filters = readFilters(params);

  const [result, staff, counts] = await Promise.all([
    getLeads(filters),
    getAssignableStaff(),
    getLeadViewCounts(),
  ]);

  const staffById = new Map(staff.map((person) => [person.id, person.name]));
  const view = filters.view ?? "open";

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold">Enquiries</h1>
          <p className="mt-2 text-sm text-text-muted">
            Everything both public forms have sent, newest first.
          </p>
        </div>

        {result.total > 0 && (
          <Link
            href={`/admin/leads/export?${new URLSearchParams(
              Object.entries({
                q: filters.q ?? "",
                status: filters.status ?? "",
                assigned: filters.assigned ?? "",
                view,
              }).filter(([, value]) => value !== ""),
            ).toString()}`}
            prefetch={false}
            className="inline-flex items-center gap-2 rounded-lg border border-border-strong bg-surface px-4 py-2.5 text-sm font-medium transition-colors hover:bg-surface-2"
          >
            <Download className="size-4" aria-hidden />
            Export CSV
          </Link>
        )}
      </header>

      <nav aria-label="Views" className="mt-8 flex flex-wrap gap-1 border-b border-border">
        <ViewTab current={view} value="open" label="Open" count={counts.open} />
        <ViewTab current={view} value="archived" label="Archived" count={counts.archived} />
        <ViewTab current={view} value="spam" label="Spam" count={counts.spam} />
      </nav>

      <LeadFilterBar staff={staff} className="mt-6" />

      {result.rows.length > 0 ? (
        <>
          {/* A table on a wide screen, cards on a narrow one. A table forced
              onto a phone becomes a horizontal scroll nobody discovers. */}
          <ul className="mt-6 space-y-3 lg:hidden">
            {result.rows.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/admin/leads/${lead.id}`}
                  className="surface-raised block rounded-xl border border-border p-4 transition-colors hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 truncate font-medium">{lead.name}</p>
                    <StatusBadge status={lead.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-text-muted">
                    {[lead.company_name, lead.email].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-3 font-mono text-xs text-text-subtle">
                    {[
                      formatDate(lead.created_at),
                      lead.service?.name,
                      lead.assigned_to ? staffById.get(lead.assigned_to) : "Unassigned",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 hidden overflow-hidden rounded-xl border border-border lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-surface-2/60">
                <tr>
                  <Th>Name</Th>
                  <Th>Enquiry</Th>
                  <Th>Status</Th>
                  <Th>Assigned</Th>
                  <Th>Received</Th>
                  <th className="w-12 px-4 py-3">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.rows.map((lead) => (
                  <tr key={lead.id} className="group transition-colors hover:bg-surface-2/50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="font-medium transition-colors group-hover:text-accent"
                      >
                        {lead.name}
                      </Link>
                      {lead.company_name && (
                        <p className="text-xs text-text-subtle">{lead.company_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      <p className="truncate">{lead.email}</p>
                      {lead.service?.name && (
                        <p className="text-xs text-text-subtle">{lead.service.name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {lead.assigned_to
                        ? (staffById.get(lead.assigned_to) ?? "Someone else")
                        : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-text-subtle">
                      {formatDate(lead.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        aria-label={`Open ${lead.name}`}
                        className="inline-grid size-8 place-items-center rounded-lg text-text-subtle transition-colors hover:bg-surface-3 hover:text-accent"
                      >
                        <ArrowUpRight className="size-4" aria-hidden />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination result={result} params={params} />
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-surface-2/40 p-8 md:p-12">
          <h2 className="font-display text-lg font-semibold">{emptyHeading(view, filters)}</h2>
          <p className="measure mt-3 text-sm leading-relaxed text-text-muted">
            {emptyBody(view, filters)}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[0.65rem] font-normal uppercase tracking-[0.14em] text-text-subtle">
      {children}
    </th>
  );
}

function ViewTab({
  current,
  value,
  label,
  count,
}: {
  current: string;
  value: string;
  label: string;
  count: number;
}) {
  const active = current === value;

  return (
    <Link
      href={value === "open" ? "/admin/leads" : `/admin/leads?view=${value}`}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "-mb-px border-b-2 border-accent px-4 py-2.5 text-sm font-medium text-accent"
          : "-mb-px border-b-2 border-transparent px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-text"
      }
    >
      {label}
      <span className="ml-2 font-mono text-xs text-text-subtle">{count}</span>
    </Link>
  );
}

function Pagination({
  result,
  params,
}: {
  result: { page: number; pageCount: number; total: number };
  params: Record<string, string | string[] | undefined>;
}) {
  if (result.pageCount <= 1) return null;

  const link = (page: number) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === "string" && value && key !== "page") next.set(key, value);
    }
    if (page > 1) next.set("page", String(page));
    const query = next.toString();
    return query ? `/admin/leads?${query}` : "/admin/leads";
  };

  const first = (result.page - 1) * LEADS_PER_PAGE + 1;
  const last = Math.min(result.page * LEADS_PER_PAGE, result.total);

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-4 text-sm"
    >
      <p className="text-text-subtle">
        {first}–{last} of {result.total}
      </p>

      <div className="flex gap-2">
        {result.page > 1 && (
          <Link
            href={link(result.page - 1)}
            className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-2"
          >
            Previous
          </Link>
        )}
        {result.page < result.pageCount && (
          <Link
            href={link(result.page + 1)}
            className="rounded-lg border border-border px-3 py-2 transition-colors hover:bg-surface-2"
          >
            Next
          </Link>
        )}
      </div>
    </nav>
  );
}

/**
 * The query string, narrowed to what the list understands.
 *
 * Anything unrecognised is dropped rather than passed through — a status that
 * is not in the enum would make PostgREST reject the whole query, turning a
 * mistyped URL into an empty screen with no explanation.
 */
function readFilters(params: Record<string, string | string[] | undefined>): LeadFilters {
  const one = (key: string) => {
    const value = params[key];
    return typeof value === "string" ? value : undefined;
  };

  const status = one("status");
  const view = one("view");
  const page = Number(one("page"));

  return {
    q: one("q")?.trim() || undefined,
    status: isLeadStatus(status) ? status : undefined,
    assigned: one("assigned") || undefined,
    view: view === "archived" || view === "spam" ? view : "open",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function emptyHeading(view: string, filters: LeadFilters): string {
  if (filters.q || filters.status || filters.assigned) return "Nothing matches those filters";
  if (view === "archived") return "The archive is empty";
  if (view === "spam") return "Nothing marked as spam";
  return "No enquiries yet";
}

function emptyBody(view: string, filters: LeadFilters): string {
  if (filters.q || filters.status || filters.assigned) {
    return "Clear the filters to see everything, or try a shorter search — the search looks at name, company, email and phone.";
  }
  if (view === "archived") {
    return "Archiving moves an enquiry out of the main list without deleting it. Nothing here has been archived yet.";
  }
  if (view === "spam") {
    return "Marking an enquiry as spam hides it from the main list. It is still here, and the mark can be taken off again.";
  }
  return "Both the contact form and the quote form write here the moment someone submits one, and the notification email goes out at the same time.";
}
