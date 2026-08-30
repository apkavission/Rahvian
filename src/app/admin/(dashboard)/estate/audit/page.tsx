import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { createControlClient } from "@/lib/supabase/control";
import { Unavailable } from "../page";

export const metadata: Metadata = { title: "What was done" };

/**
 * The audit log.
 *
 * ---------------------------------------------------------------------------
 * **Append-only, and there is no screen anywhere that edits it.**
 *
 * Nothing updates a row and nothing deletes one. There is no policy granting
 * either, and every insert goes through `control.note`, which runs as the
 * definer — so an application may add to the log and may not tidy it. A log
 * somebody can edit is not evidence of anything.
 *
 * ---------------------------------------------------------------------------
 * **The email is copied onto the row rather than joined for.**
 *
 * An account deleted six months from now must not turn its lines into
 * "somebody". An audit line that cannot name who did it is not an audit line,
 * and the join that would have answered it is exactly what stops working.
 *
 * ---------------------------------------------------------------------------
 * **What it does not yet record, said plainly.** Only actions written through
 * `control.note` appear here, and the estate is at the beginning of adding
 * those calls. An empty log means nothing has been recorded — not that nothing
 * has happened — and this screen says so rather than implying otherwise.
 */
export default async function AuditPage() {
  await requireMenu("estate");

  const supabase = await createControlClient();

  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("at", { ascending: false })
    .limit(200);

  if (error) return <Unavailable message={error.message} />;

  const rows = data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <Link
          href="/admin/estate"
          className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text"
        >
          <ChevronLeft className="size-4" aria-hidden />
          The estate
        </Link>

        <h1 className="font-display mt-3 text-2xl font-semibold tracking-tight">
          What was done
        </h1>
        <p className="measure mt-2 text-sm text-text-muted">
          Append-only. Nothing here can be edited or deleted by any screen,
          including this one.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-sm">
          <p className="font-medium">Nothing recorded yet.</p>
          <p className="measure mt-2 text-text-muted">
            That means no action has called <code>control.note</code> — not that
            nothing has happened. The estate has just gained the log; the calls
            that write to it are added action by action, and an empty log that
            pretended otherwise would be worse than none.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap gap-4 p-4 text-sm">
              <time
                dateTime={row.at}
                className="w-40 shrink-0 text-xs text-text-subtle"
              >
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(row.at))}
              </time>

              <span className="min-w-0 flex-1">
                <span className="block font-medium">{row.action}</span>
                {row.subject && (
                  <span className="block text-text-muted">{row.subject}</span>
                )}
              </span>

              <span className="w-48 shrink-0 text-right text-xs text-text-subtle">
                {row.actor_email ?? "unknown"}
                {row.app_key && <span className="block">{row.app_key}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
