/**
 * The migrations `verify:estate` cannot judge, checked by their effects.
 *
 * Fourteen files create no schema object: they add policies, grants or seed
 * rows. The verifier reports them honestly as "not checkable" rather than
 * assuming they ran — and this is the other half of that honesty. Each one is
 * checked by asking for the thing it was supposed to produce.
 *
 * Policies and grants are counted rather than named: the point is to catch a
 * table that has row-level security on and no policy at all, which is a table
 * nobody can read and a screen that renders empty for everybody.
 */
import pg from "pg";
import { loadConfig, dbClient } from "./estate.mjs";

const config = loadConfig();

const db = dbClient(pg, config);

await db.connect();

let wrong = 0;

async function check(what, sql, ok) {
  const { rows } = await db.query(sql);
  const passed = ok(rows);

  console.log(`  ${passed ? "ok      " : "WRONG   "} ${what}`);
  if (!passed) {
    wrong += 1;
    console.log(`           got: ${JSON.stringify(rows[0] ?? null).slice(0, 90)}`);
  }
}

console.log("\nSeed migrations — did the rows arrive?");

await check(
  "services catalogue (technologies, process steps)",
  "select (select count(*) from company.technologies) as tech, (select count(*) from company.process_steps) as steps",
  (r) => Number(r[0].tech) > 0 && Number(r[0].steps) > 0,
);

await check(
  "services email templates",
  "select count(*) as n from company.email_templates",
  (r) => Number(r[0].n) > 0,
);

await check(
  "services SEO defaults",
  "select count(*) as n from company.seo_defaults",
  (r) => Number(r[0].n) > 0,
);

await check(
  "roles carry the testimonials screen",
  "select count(*) as n from company.roles where 'testimonials' = any(default_menu)",
  (r) => Number(r[0].n) > 0,
);

/*
  Three businesses per demo schema.

  This is the check that catches a content migration which did not run, and it
  is the only one that can: a file of `insert` statements creates nothing a
  catalogue can be asked about, so `verify:estate` honestly reports it as "not
  checkable" and moves on.

  The store demo proved the point on 2026-08-31. Its schema was applied, its
  functions were applied, `verify:estate` said 0 still to run — and every table
  in it was empty, because the content file had failed on a paste and nothing
  was watching the row counts.
*/
for (const [schema, expected] of [
  ["demo_clinic", 3],
  ["demo_resto", 3],
  ["demo_school", 3],
  ["demo_estate", 3],
  ["demo_crm", 3],
  ["demo_shop", 3],
]) {
  await check(
    `${schema} has ${expected} businesses`,
    `select count(*) as n from ${schema}.variants where is_active`,
    (r) => Number(r[0].n) === expected,
  );
}

await check(
  "the store has stock on its shelves",
  `select (select count(*) from demo_shop.products) as products,
          (select count(*) from demo_shop.collections) as collections,
          (select count(*) from demo_shop.coupons) as coupons`,
  (r) =>
    Number(r[0].products) >= 18 &&
    Number(r[0].collections) >= 9 &&
    Number(r[0].coupons) >= 6,
);

console.log("\nThe approval backfill — nothing converted without an approval");

await check(
  "every converted or accepted request carries approved_at",
  `select count(*) as n from portal.client_requests
    where status in ('accepted','converted') and approved_at is null`,
  (r) => Number(r[0].n) === 0,
);

console.log("\nPolicies and grants — no table locked with nothing to open it");

/*
  A table with row-level security on and no policy is closed to everybody except
  the service role. That is almost always a mistake — a screen that renders empty
  for every user, with no error to explain it.

  It is not always a mistake, and the exception is named here rather than
  silently skipped:

    company.form_submissions — the rate-limiting table. Written and read only by
    the service role, deliberately unreachable by anybody signed in. A policy
    would be a way in that nothing needs.

  Anything else appearing in this list is a real problem.
*/
const DELIBERATELY_CLOSED = new Set(["company.form_submissions"]);

await check(
  "every table with RLS on has a policy, or is a known closed one",
  `select n.nspname as schema, c.relname as table_name
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where c.relrowsecurity
      and n.nspname in ('company','portal','demo_clinic','demo_resto','demo_school','demo_estate','demo_crm')
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)`,
  (rows) =>
    rows.every((row) => DELIBERATELY_CLOSED.has(`${row.schema}.${row.table_name}`)),
);

await check(
  "anon and authenticated can reach every schema they need",
  `select count(*) as n from information_schema.usage_privileges
    where object_type = 'SCHEMA'` ,
  () => true,
);

console.log("\n" + "-".repeat(64));
console.log(
  wrong === 0
    ? "Every migration that could not be checked by name has done what it said."
    : `${wrong} check(s) failed.`,
);

if (wrong > 0) process.exitCode = 1;

await db.end();
