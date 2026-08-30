import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { requireMenu } from "@/lib/auth/session";
import { createControlClient } from "@/lib/supabase/control";
import type { EstateCount } from "@/types/control";

export const metadata: Metadata = { title: "The estate" };

/**
 * Every application, in one place.
 *
 * ---------------------------------------------------------------------------
 * **The cost of not having this was paid daily.** Eight panels were opened by
 * hand to answer questions like "is the property demo still up" and "has
 * anybody written in" — which meant those questions were mostly not answered.
 *
 * ---------------------------------------------------------------------------
 * **`reachable` is the column worth reading, and it is the reason this is not
 * a hardcoded list of links.**
 *
 * `control.estate_counts()` asks the database whether each application's schema
 * is actually there, and counts what is in it. A schema that has been dropped,
 * renamed, or never created answers `false` rather than raising — so one broken
 * application does not stop the other seven being reported, which is exactly
 * what a dashboard is for.
 *
 * It does **not** check whether the site is serving. That needs an HTTP request
 * per application on every render, and a dashboard that takes eight round trips
 * to a dev server to draw is a dashboard nobody opens. What it can answer
 * cheaply and honestly, it answers.
 */
export default async function EstatePage() {
  await requireMenu("estate");

  const supabase = await createControlClient();

  const { data, error } = await supabase.rpc("estate_counts");

  if (error) {
    return <Unavailable message={error.message} />;
  }

  const apps = (data ?? []) as EstateCount[];
  const broken = apps.filter((app) => !app.reachable);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">The estate</h1>
        <p className="measure mt-2 text-sm text-text-muted">
          Eight applications on one database, each with its own schema, its own
          panel and its own accounts list — which is this one. Everything below
          is counted from the database when this page renders.
        </p>
      </header>

      {broken.length > 0 && (
        <p className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            <strong>{broken.map((app) => app.name).join(", ")}</strong>{" "}
            {broken.length === 1 ? "has" : "have"} no schema in the database. The
            migrations have not been run, or the schema has been renamed.
          </span>
        </p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => (
          <li
            key={app.app_key}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-medium">{app.name}</h2>
                <p className="mt-0.5 text-xs text-text-subtle">
                  {app.kind} · {app.app_key}
                </p>
              </div>

              {app.reachable ? (
                <CheckCircle2
                  className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-label="Its schema is there"
                />
              ) : (
                <AlertTriangle
                  className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-label="No schema"
                />
              )}
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Cell label="Businesses" value={app.variants} />
              <Cell label="Enquiries" value={app.enquiries} />
              <Cell label="Messages" value={app.messages} />
            </dl>

            <a
              href={app.base_url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              {app.base_url.replace(/^https?:\/\//, "")}
              <ArrowUpRight className="size-3" aria-hidden />
            </a>
          </li>
        ))}
      </ul>

      <nav className="flex flex-wrap gap-3">
        <Link
          href="/admin/estate/inbox"
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-2"
        >
          One inbox for everything
        </Link>
        <Link
          href="/admin/estate/audit"
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-2"
        >
          What was done
        </Link>
      </nav>
    </div>
  );
}

/**
 * A count, or a dash.
 *
 * **A dash where the application has no such table, and a zero where it has
 * one and it is empty.** Those are different facts and rendering both as `0`
 * would say the task tracker has no enquiries, which is not true — it does not
 * have enquiries at all.
 */
function Cell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg bg-surface-2 px-2 py-2.5">
      <dd className="font-display text-lg font-semibold tabular-nums">
        {value === null ? <span className="text-text-subtle">—</span> : value}
      </dd>
      <dt className="mt-0.5 text-[11px] text-text-subtle">{label}</dt>
    </div>
  );
}

/**
 * What the screen says when the schema is not there yet.
 *
 * The commonest cause by far, and the message says so rather than printing a
 * PostgREST error and leaving somebody to search for it.
 */
export function Unavailable({ message }: { message: string }) {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-semibold tracking-tight">The estate</h1>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-sm">
        <p className="font-medium">These screens are not connected yet.</p>

        <p className="measure mt-2 text-text-muted">
          Two things are needed, in this order. Run{" "}
          <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">
            supabase/migrations/20260902000018_control_estate.sql
          </code>
          , then add <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs">control</code>{" "}
          to the exposed-schema list:
        </p>

        <pre className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">
          {`alter role authenticator set pgrst.db_schemas =
  'public, graphql_public, company, portal, control,
   demo_clinic, demo_resto, demo_school, demo_estate, demo_crm, demo_shop';
notify pgrst, 'reload config';`}
        </pre>

        <p className="mt-3 text-xs text-text-subtle">
          What the database actually said: {message}
        </p>
      </div>
    </div>
  );
}
