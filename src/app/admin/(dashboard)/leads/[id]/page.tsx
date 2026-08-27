import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { StatusBadge } from "@/components/admin/status-badge";
import { canManageLeads, requireStaff } from "@/lib/auth/session";
import { getAssignableStaff, getLead } from "@/lib/queries/leads";
import type { LeadActivityRow, LeadDetail } from "@/lib/queries/leads";
import { isLeadStatus, LEAD_STATUS_LABEL } from "@/lib/validation/leads";
import { formatDate } from "@/lib/utils";
import { LeadControls, LeadFlags } from "./lead-controls";
import { NoteForm } from "./note-form";

export const metadata: Metadata = {
  title: "Enquiry",
  robots: { index: false, follow: false, nocache: true },
};

type Params = { params: Promise<{ id: string }> };

/**
 * One enquiry.
 *
 * Everything the person actually wrote is at the top, unabbreviated. The
 * pipeline controls sit beside it rather than above it, because the decision
 * they express is made after reading — putting a status selector first invites
 * it to be set before anyone has.
 */
export default async function LeadPage({ params }: Params) {
  const { profile } = await requireStaff();
  if (!canManageLeads(profile)) notFound();

  const { id } = await params;
  const [lead, staff] = await Promise.all([getLead(id), getAssignableStaff()]);

  if (!lead) notFound();

  const status = isLeadStatus(lead.status) ? lead.status : "new";
  const utm = readUtm(lead.utm);

  return (
    <div className="mx-auto w-full max-w-6xl">
      <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.16em]">
        <Link href="/admin/leads" className="text-text-subtle transition-colors hover:text-accent">
          Enquiries
        </Link>
      </nav>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-semibold">{lead.name}</h1>
            <StatusBadge status={status} />
            {lead.archived_at && <Flag>Archived</Flag>}
            {lead.is_spam && <Flag>Spam</Flag>}
          </div>

          {lead.company_name && (
            <p className="mt-1.5 text-text-muted">{lead.company_name}</p>
          )}

          <p className="mt-3 font-mono text-xs text-text-subtle">
            Received {formatDate(lead.created_at)}
            {lead.service?.name ? ` · ${lead.service.name}` : ""}
          </p>
        </div>

        <LeadFlags
          leadId={lead.id}
          archived={Boolean(lead.archived_at)}
          isSpam={lead.is_spam}
        />
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-12">
        <div className="min-w-0 space-y-8">
          {/* What they wrote. First, and in full. */}
          <section
            aria-labelledby="message-heading"
            className="surface-raised rounded-2xl border border-border p-6"
          >
            <h2 id="message-heading" className="font-display text-base font-semibold">
              Their message
            </h2>
            {lead.description ? (
              <p className="measure mt-4 whitespace-pre-wrap leading-relaxed text-text-muted">
                {lead.description}
              </p>
            ) : (
              <p className="mt-4 text-sm text-text-subtle">
                They did not write a message — this came from the short form.
              </p>
            )}
          </section>

          <section aria-labelledby="brief-heading">
            <h2 id="brief-heading" className="font-display text-base font-semibold">
              The brief
            </h2>
            <dl className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
              <Detail term="Budget" value={lead.budget_range} />
              <Detail term="Timeline" value={lead.timeline} />
              <Detail term="Prefers" value={lead.preferred_contact} />
              <Detail term="Existing site" value={lead.existing_website} link />
              <Detail term="Submitted from" value={lead.source_page} />
              <Detail term="Came via" value={lead.referrer} />
              {utm.map(([key, value]) => (
                <Detail key={key} term={key.replace("utm_", "")} value={value} />
              ))}
            </dl>
          </section>

          <section aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="font-display text-base font-semibold">
              Notes
            </h2>

            <div className="mt-4">
              <NoteForm leadId={lead.id} />
            </div>

            {lead.notes.length > 0 ? (
              <ul className="mt-8 space-y-4">
                {lead.notes.map((note) => (
                  <li key={note.id} className="rounded-xl border border-border bg-surface-2/40 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{note.body}</p>
                    <p className="mt-3 font-mono text-xs text-text-subtle">
                      {[note.author?.full_name || "Someone", formatDate(note.created_at)]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-sm text-text-subtle">
                No notes yet. What was said on a call belongs here, not in one
                person&rsquo;s memory.
              </p>
            )}
          </section>

          <section aria-labelledby="history-heading">
            <h2 id="history-heading" className="font-display text-base font-semibold">
              History
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              Written by the database itself when a status or an assignment
              changes, so it cannot be forgotten or edited afterwards.
            </p>

            {lead.activity.length > 0 ? (
              <ol className="mt-5 space-y-3 border-l border-border pl-5">
                {lead.activity.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span className="text-text-muted">{describe(entry)}</span>
                    <span className="ml-2 font-mono text-xs text-text-subtle">
                      {formatDate(entry.created_at)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 text-sm text-text-subtle">
                Nothing has changed since it arrived.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-24 lg:self-start">
          <section
            aria-labelledby="reach-heading"
            className="surface-raised rounded-2xl border border-border p-6"
          >
            <h2 id="reach-heading" className="font-display text-base font-semibold">
              Reach them
            </h2>
            <ul className="mt-4 space-y-3 text-sm">
              <Channel
                icon={<Mail className="size-4" aria-hidden />}
                href={`mailto:${lead.email}`}
                label={lead.email}
              />
              {lead.phone && (
                <Channel
                  icon={<Phone className="size-4" aria-hidden />}
                  href={`tel:${lead.phone.replace(/\s+/g, "")}`}
                  label={lead.phone}
                />
              )}
              {lead.whatsapp && (
                <Channel
                  icon={<MessageCircle className="size-4" aria-hidden />}
                  href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}
                  label={lead.whatsapp}
                  external
                />
              )}
            </ul>

            {/* Recorded at submission from the form, per the DPDP Act. */}
            <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-text-subtle">
              {lead.consent_given
                ? "They agreed to be contacted about this enquiry."
                : "No consent was recorded with this enquiry."}
            </p>
          </section>

          <section
            aria-labelledby="pipeline-heading"
            className="surface-raised rounded-2xl border border-border p-6"
          >
            <h2 id="pipeline-heading" className="font-display text-base font-semibold">
              Pipeline
            </h2>
            <div className="mt-4">
              <LeadControls
                leadId={lead.id}
                status={status}
                assignedTo={lead.assigned_to}
                staff={staff}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Flag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-3 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-subtle">
      {children}
    </span>
  );
}

/** Nothing is printed for a field the enquirer left blank. */
function Detail({
  term,
  value,
  link,
}: {
  term: string;
  value: string | null | undefined;
  link?: boolean;
}) {
  if (!value) return null;

  return (
    <div>
      <dt className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-text-subtle">
        {term}
      </dt>
      <dd className="mt-1.5 break-words text-sm">
        {link && /^https?:\/\//i.test(value) ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline underline-offset-4"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}

function Channel({
  icon,
  href,
  label,
  external,
}: {
  icon: React.ReactNode;
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <li>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="flex items-center gap-3 text-text-muted transition-colors hover:text-accent"
      >
        <span className="shrink-0 text-text-subtle">{icon}</span>
        <span className="min-w-0 break-all">{label}</span>
      </a>
    </li>
  );
}

/**
 * One audit entry, in words.
 *
 * The trigger stores raw enum values and uuids, which is right for a durable
 * record and wrong on a screen. Statuses are mapped to their labels; an
 * assignment stores an id we cannot resolve to a name here without another
 * query, so it says that someone was assigned rather than inventing a name.
 */
function describe(entry: LeadActivityRow): string {
  const who = entry.actor?.full_name || "Someone";

  if (entry.action === "status_changed") {
    const from = isLeadStatus(entry.from_value) ? LEAD_STATUS_LABEL[entry.from_value] : entry.from_value;
    const to = isLeadStatus(entry.to_value) ? LEAD_STATUS_LABEL[entry.to_value] : entry.to_value;
    return `${who} moved it from ${from} to ${to}.`;
  }

  if (entry.action === "assigned") {
    if (!entry.to_value) return `${who} cleared the assignment.`;
    return `${who} assigned it.`;
  }

  return `${who} — ${entry.action.replace(/_/g, " ")}.`;
}

/** `utm` is jsonb; only string values are shown. */
function readUtm(value: LeadDetail["utm"]): [string, string][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "",
  );
}
