/**
 * Does the query the panel actually contains work against its own schema?
 *
 * **It reads the select string out of the source file** rather than repeating it
 * here. A check that carries its own copy of the query tests the copy — which is
 * exactly what happened the first time this was written: the code had been fixed
 * and the check still reported a failure, because it was asking a question
 * nobody's code was asking any more.
 *
 * The bug this exists for: the four newer demos were forked from the clinic,
 * where the enquiry embeds `services(name)` and `doctors(full_name)`. Those
 * tables do not exist in the other schemas. PostgREST refuses the join, the page
 * turns the error into an empty list, and the dashboard shows no enquiries at
 * all while looking perfectly healthy.
 *
 * TypeScript cannot see it — the generated types declare no relationships, so an
 * embed is unchecked. Only the database can answer this one.
 *
 *     cd services && npm run check:queries
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { loadConfig, projectDir } from "./estate.mjs";

const config = loadConfig();

const DEMOS = [
  { dir: "demo-clinic", schema: "demo_clinic", enquiry: "appointments" },
  { dir: "demo-restaurant", schema: "demo_resto", enquiry: "reservations" },
  { dir: "demo-school", schema: "demo_school", enquiry: "admissions" },
  { dir: "demo-realestate", schema: "demo_estate", enquiry: "viewings" },
  { dir: "demo-crm", schema: "demo_crm", enquiry: "trials" },
];

let bad = 0;

for (const demo of DEMOS) {
  const dir = projectDir(demo.dir);
  if (!dir) {
    console.log(`?  ${demo.dir} is not on this machine — its dashboard was not read`);
    continue;
  }

  const source = readFileSync(`${dir}/src/app/admin/page.tsx`, "utf8");

  /* Every `.select("...")` in the dashboard, exactly as written. */
  const selects = [...source.matchAll(/\.select\(\s*"([^"]+)"/g)].map((m) => m[1]);

  const db = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: demo.schema },
    auth: { persistSession: false },
  });

  const tables = [demo.enquiry, "messages", "share_links"];
  let broken = 0;

  for (const [index, select] of selects.entries()) {
    const table = tables[index] ?? demo.enquiry;
    const { error } = await db.from(table).select(select).limit(1);

    if (error) {
      broken += 1;
      console.log(`WRONG    ${demo.dir} — ${table}`);
      console.log(`         ${select.slice(0, 90)}`);
      console.log(`         ${error.message.slice(0, 100)}`);
    }
  }

  if (broken === 0) {
    console.log(`ok       ${demo.dir.padEnd(16)} ${selects.length} queries`);
  } else {
    bad += 1;
  }
}

console.log(
  "\n" +
    (bad === 0
      ? "Every dashboard query runs against its own schema."
      : `${bad} demo(s) have a query that fails.`),
);

if (bad > 0) process.exitCode = 1;
