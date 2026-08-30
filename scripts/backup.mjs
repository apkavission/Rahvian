#!/usr/bin/env node
/**
 * Nightly backup of everything the owner has typed.
 *
 *   npm run db:backup            write a backup to R2
 *   npm run db:backup -- --local write it to ./backups instead, and upload nothing
 *   npm run db:backup -- --list  list what is already in the bucket
 *
 * **Why this is a JSON export and not `pg_dump`.** The obvious answer to
 * "Supabase's free tier has no restorable backups" is a nightly `pg_dump`, and
 * that is what `docs/PROGRESS.md` planned. It cannot be what runs: this backup
 * has to happen on a schedule, the schedule will be a Vercel cron function, and
 * **a Vercel function has no `pg_dump` binary in it.** Neither does this
 * machine. A backup that only works where somebody has installed Postgres
 * locally is a backup that stops happening the week attention moves elsewhere.
 *
 * **What this does and does not save.** It reads every table in the `company`
 * schema through the service-role key and writes them as one gzipped JSON
 * document. That is all the content, every enquiry, every account's profile row
 * and every media record — everything a person entered.
 *
 * It does **not** save the schema, the row-level security policies, or the auth
 * users. Those are covered elsewhere and deliberately: the schema and the
 * policies are the migrations in `supabase/migrations`, which are in this
 * repository, and the auth users are two accounts that are recreated by
 * `npm run admin:create`. Migrations plus this file is a restore.
 *
 * It also does not save the files in R2 — the images themselves. They are
 * already in R2, which is where this backup goes, so copying them into it would
 * be duplicating the thing it is protecting against nothing.
 *
 * **This script never deletes anything.** Pruning the thirty-day window belongs
 * to the scheduled route, `/api/cron/backup`, where the rule lives in one
 * tested function. A person running this by hand — usually because something
 * has gone wrong — should be able to take a backup without any chance of
 * removing one, and a second copy of a deletion rule is a second copy that can
 * be wrong. The first version of that rule was: it deleted a thirty-day-old
 * backup on the morning of day thirty rather than day thirty-one, which
 * `src/lib/backup/retention.test.ts` caught the day it was written.
 *
 * Read-only against the database. The only thing it writes is one object in the
 * bucket.
 */

import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { createWriteStream, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "company";

/** Rows per request. The client caps a response, so large tables are paged. */
const PAGE = 1000;

// ---------------------------------------------------------------------------
// Environment

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* CI and the cron function pass them directly */
  }
  return { ...env, ...process.env };
}

const env = loadEnv();

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const LOCAL_ONLY = args.has("--local");
const LIST_ONLY = args.has("--list");

/**
 * Every table to save, in dependency order.
 *
 * The list lives in `src/lib/backup/tables.json` and not in this file, because
 * two things read it: this script, and the scheduled route that runs the same
 * backup on Vercel. One list, one place, and a unit test —
 * `src/lib/backup/tables.test.ts` — checks it against the generated database
 * types on every run.
 *
 * That test is the point of the arrangement. A table added to the schema and
 * not added here is a table that silently stops being backed up, and nobody
 * finds out until a restore. Now the test fails the moment `npm run db:types`
 * regenerates the types with a table this list has never heard of.
 *
 * The order is the order a restore would insert in, so a foreign key never
 * points at a row that does not exist yet.
 */
const TABLES = JSON.parse(
  readFileSync(resolve(ROOT, "src/lib/backup/tables.json"), "utf8"),
);

// ---------------------------------------------------------------------------
// Supabase, over the REST endpoint
//
// No client library. This script runs from `node` with no build step, and the
// whole of what it needs is a paged GET with two headers.

async function readTable(table) {
  const rows = [];

  for (let from = 0; ; from += PAGE) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;

    const response = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Accept-Profile": SCHEMA,
        Range: `${from}-${from + PAGE - 1}`,
      },
    });

    if (!response.ok) {
      throw new Error(`${table}: ${response.status} ${await response.text()}`);
    }

    const page = await response.json();
    rows.push(...page);

    if (page.length < PAGE) return rows;
  }
}

// ---------------------------------------------------------------------------
// R2

async function r2() {
  const { S3Client } = await import("@aws-sdk/client-s3");

  for (const key of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"]) {
    if (!env[key]) {
      console.error(`Missing ${key}. Run with --local to write the file to disk instead.`);
      process.exit(1);
    }
  }

  return {
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    }),
    bucket: env.R2_BUCKET_NAME,
  };
}

async function listBackups({ client, bucket }) {
  const { ListObjectsV2Command } = await import("@aws-sdk/client-s3");

  const out = await client.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: "backups/" }),
  );

  return (out.Contents ?? []).map((object) => ({
    key: object.Key,
    size: object.Size ?? 0,
    modified: object.LastModified,
  }));
}

// ---------------------------------------------------------------------------

function bytes(n) {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

async function main() {
  if (LIST_ONLY) {
    const store = await r2();
    const backups = (await listBackups(store)).sort((a, b) => a.key.localeCompare(b.key));

    if (backups.length === 0) {
      console.log("No backups in the bucket yet.");
      return;
    }

    for (const backup of backups) {
      console.log(`${backup.key}  ${bytes(backup.size)}`);
    }
    console.log(`\n${backups.length} backup${backups.length === 1 ? "" : "s"}.`);
    return;
  }

  // The date is taken once and used for the name, the payload and the pruning
  // cutoff, so a run that crosses midnight does not file itself under two days.
  const now = new Date();
  const date = now.toISOString().slice(0, 10);

  const data = {};
  let total = 0;

  for (const table of TABLES) {
    const rows = await readTable(table);
    data[table] = rows;
    total += rows.length;
    console.log(`  ${table.padEnd(20)} ${String(rows.length).padStart(5)} rows`);
  }

  const payload = {
    taken_at: now.toISOString(),
    schema: SCHEMA,
    supabase_url: SUPABASE_URL,
    /*
      What a restore also needs, said in the file itself rather than in a
      document somebody has to find. A backup that does not explain how to use
      it is a backup that gets restored wrongly under pressure.
    */
    restore_notes:
      "Schema and RLS policies are the migrations in supabase/migrations — apply those first. " +
      "Auth users are not in here; recreate them with npm run admin:create. " +
      "Tables below are in insert order, so foreign keys resolve if replayed top to bottom.",
    tables: data,
  };

  const body = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  const key = `backups/${date}.json.gz`;

  console.log(`\n${total} rows across ${TABLES.length} tables — ${bytes(body.byteLength)} gzipped.`);

  if (LOCAL_ONLY) {
    const dir = resolve(ROOT, "backups");
    mkdirSync(dir, { recursive: true });
    const path = resolve(dir, `${date}.json.gz`);
    await pipeline(Readable.from(body), createWriteStream(path));
    console.log(`Written to ${path}`);
    console.log("Nothing was uploaded. Drop --local to send it to R2.");
    return;
  }

  const store = await r2();
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");

  await store.client.send(
    new PutObjectCommand({
      Bucket: store.bucket,
      Key: key,
      Body: body,
      ContentType: "application/gzip",
      // Deliberately no `ContentEncoding: gzip`. The scheduled route writes the
      // same key through the application's own `putObject`, which does not set
      // it — and two writers of one key format producing subtly different
      // objects is exactly the drift worth not having. It is a file to be
      // downloaded and gunzipped, not served, so the header buys nothing.
    }),
  );

  console.log(`Uploaded ${key}`);
  console.log("Nothing was deleted — pruning is the scheduled job's, not this one's.");
}

main().catch((error) => {
  // Loud, and with the table name in it. A backup that fails quietly is worse
  // than no backup, because it is believed.
  console.error("\nBackup FAILED:", error.message);
  process.exit(1);
});
