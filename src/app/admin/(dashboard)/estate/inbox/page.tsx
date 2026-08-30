import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { createControlClient } from "@/lib/supabase/control";
import { Unavailable } from "../page";
import type { InboxLine } from "@/types/control";

export const metadata: Metadata = { title: "One inbox" };

/**
 * Everything anybody has written to any of the eight applications.
 *
 * ---------------------------------------------------------------------------
 * **The question this answers is "has anybody written in today".**
 *
 * Before it, answering that meant signing into six demo panels in turn — which
 * meant it was not answered, and a prospect who filled in a demo's contact form
 * on Friday heard nothing until somebody happened to open that demo.
 *
 * ---------------------------------------------------------------------------
 * **Only enough to decide whether to open it.**
 *
 * A name, a line of what they said, and which application it came from. No
 * phone numbers, no addresses, no order totals. This is a screen for triage,
 * and the details stay in the application that owns them — one place holding a
 * copy of every business's contact details is exactly what this estate has
 * spent its whole design avoiding.
 */
export default async function InboxPage() {
  await requireMenu("estate");

  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("estate_inbox", { p_limit: 100 });

  if (error) return <Unavailable message={error.message} />;

  const lines = (data ?? []) as InboxLine[];

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
          One inbox
        </h1>
        <p className="measure mt-2 text-sm text-text-muted">
          Every enquiry and every message, from all eight applications, newest
          first. Open the application itself to reply — the phone numbers and
          addresses stay where they were written.
        </p>
      </header>

      {lines.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-text-muted">
          Nothing yet, anywhere.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {lines.map((line, index) => (
            <li key={`${line.app_key}-${line.at}-${index}`} className="flex gap-4 p-4">
              <span className="w-32 shrink-0">
                <span className="block text-xs font-medium">{line.app_name}</span>
                <span className="block text-[11px] capitalize text-text-subtle">
                  {line.kind}
                </span>
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{line.who}</span>
                <span className="measure block text-sm text-text-muted">
                  {line.summary}
                </span>
              </span>

              <time
                dateTime={line.at}
                className="w-32 shrink-0 text-right text-xs text-text-subtle"
              >
                {new Intl.DateTimeFormat("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(line.at))}
              </time>
            </li>
          ))}
        </ul>
      )}

      <p className="measure text-xs text-text-subtle">
        The list is assembled from `control.applications` when this page renders,
        not from a hardcoded union — so a demo added next month appears here
        without anybody editing this screen. An application whose schema is not
        there yet is skipped rather than breaking the list.
      </p>
    </div>
  );
}
