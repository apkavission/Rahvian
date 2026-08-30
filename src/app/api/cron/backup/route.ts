import { gzipSync } from "node:zlib";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import TABLES from "@/lib/backup/tables.json";
import { pruneBackups } from "@/lib/backup/prune";
import { clientEnv, getServerEnv } from "@/lib/env";
import { putObject, storageConfigured } from "@/lib/storage/r2";

/**
 * The nightly backup, on a schedule.
 *
 * The same job as `npm run db:backup`, run by Vercel Cron instead of by a
 * person. Both exist on purpose and neither replaces the other:
 *
 *   **The script** needs nothing but Node and the environment file. That is the
 *   property that matters when something has gone wrong — it runs when the
 *   application will not, from a laptop, with no deployment involved.
 *
 *   **This route** is the one that actually happens every night, because
 *   nobody remembers to run a script daily for a year.
 *
 * What they share is `src/lib/backup/tables.json` — the list, which is the only
 * part that drifts, and which `tables.test.ts` checks against the generated
 * database types on every test run. The rest is forty lines of fetch and put,
 * duplicated knowingly rather than dragged through a build step so that a plain
 * `.mjs` file can import it.
 *
 * GET /api/cron/backup
 *   header: x-cron-secret: <REVALIDATE_SECRET>   — or Vercel's own Bearer token
 */

export const dynamic = "force-dynamic";

/** A backup of a database this size takes seconds; the ceiling is for a bad day. */
export const maxDuration = 300;

/** How long a backup is kept. Thirty days, as the risk register says. */
const RETENTION_DAYS = 30;

/** Rows per request. PostgREST caps a response, so large tables are paged. */
const PAGE = 1000;

function matches(provided: string | null, expected: string) {
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * One table, in full.
 *
 * Read over the REST endpoint with the service-role key rather than through the
 * shared Supabase client, because this has to see **every** row — including the
 * ones RLS hides from everybody, such as an unpublished draft or another
 * person's enquiry. A backup that respects row-level security is a backup with
 * holes in exactly the places that matter.
 */
async function readTable(url: string, key: string, table: string): Promise<unknown[]> {
  const rows: unknown[] = [];

  for (let from = 0; ; from += PAGE) {
    const response = await fetch(`${url}/rest/v1/${table}?select=*`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Accept-Profile": "company",
        Range: `${from}-${from + PAGE - 1}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`${table}: ${response.status} ${await response.text()}`);
    }

    const page = (await response.json()) as unknown[];
    rows.push(...page);

    if (page.length < PAGE) return rows;
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const sharedSecret = process.env.REVALIDATE_SECRET;

  // Fail closed. An unset secret must never mean an endpoint that will dump the
  // whole database for anybody who asks.
  if (!cronSecret && !sharedSecret) {
    console.error("[backup] neither CRON_SECRET nor REVALIDATE_SECRET is configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const authorised =
    (cronSecret && matches(request.headers.get("authorization"), `Bearer ${cronSecret}`)) ||
    (sharedSecret && matches(request.headers.get("x-cron-secret"), sharedSecret));

  if (!authorised) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Said before any work is done, and named. "R2 is not configured" from the
  // SDK, three hundred rows later, is a worse thing to read at 3am.
  if (!storageConfigured()) {
    console.error("[backup] R2 is not configured — nothing to upload to");
    return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
  }

  const env = getServerEnv();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  try {
    const tables: Record<string, unknown[]> = {};
    let rows = 0;

    for (const table of TABLES) {
      const data = await readTable(
        clientEnv.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY,
        table,
      );
      tables[table] = data;
      rows += data.length;
    }

    const body = gzipSync(
      Buffer.from(
        JSON.stringify({
          taken_at: now.toISOString(),
          schema: "company",
          supabase_url: clientEnv.NEXT_PUBLIC_SUPABASE_URL,
          restore_notes:
            "Schema and RLS policies are the migrations in supabase/migrations — apply those first. " +
            "Auth users are not in here; recreate them with npm run admin:create. " +
            "Tables below are in insert order, so foreign keys resolve if replayed top to bottom.",
          tables,
        }),
        "utf8",
      ),
    );

    const key = `backups/${date}.json.gz`;
    await putObject(key, body, "application/gzip");

    const pruned = await pruneBackups(now, RETENTION_DAYS);

    return NextResponse.json({
      ok: true,
      key,
      rows,
      tables: TABLES.length,
      bytes: body.byteLength,
      pruned,
    });
  } catch (error) {
    /*
      Loud, and with the reason in the response body.

      A backup that fails quietly is worse than no backup, because it is
      believed. Vercel Cron records the status of every run, so a 500 here is
      visible in the dashboard rather than only in a log nobody opens.
    */
    const message = error instanceof Error ? error.message : String(error);
    console.error("[backup] failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
