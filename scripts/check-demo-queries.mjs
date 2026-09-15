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
  /* The store, added 2026-09-13. Built last and never added to this list, so
     its dashboard was the one nobody checked read its own schema. */
  { dir: "demo-ecommerce", schema: "demo_shop", enquiry: "orders" },
];

let bad = 0;

for (const demo of DEMOS) {
  const dir = projectDir(demo.dir);
  if (!dir) {
    console.log(`?  ${demo.dir} is not on this machine — its dashboard was not read`);
    continue;
  }

  const source = readFileSync(`${dir}/src/app/admin/page.tsx`, "utf8");

  /*
    Every `.from("table")…select("columns")` pair in the dashboard, as written.

    **Paired, not counted.** This used to collect the selects alone and match
    them by position against a fixed list — `[enquiry, "messages",
    "share_links"]` — which worked for exactly as long as every dashboard was
    the same three queries in the same order, because they were all cut from one
    template. The store's is five queries reading `orders`, `messages`,
    `products`, `cart_totals` and `order_totals`, so by position its product
    columns were asked of `share_links` and its basket columns of `orders`. The
    check reported three broken queries; all five were fine.

    A check that infers which table a query is against, rather than reading it,
    is a check that will eventually accuse working code. `[\s\S]*?` spans the
    line break because most of these are written across several lines.
  */
  const selects = [
    ...source.matchAll(/\.from\(\s*"([^"]+)"\s*\)[\s\S]*?\.select\(\s*"([^"]+)"/g),
  ].map((m) => ({ table: m[1], columns: m[2] }));

  const db = createClient(config.NEXT_PUBLIC_SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: demo.schema },
    auth: { persistSession: false },
  });

  let broken = 0;

  for (const { table, columns } of selects) {
    const { error } = await db.from(table).select(columns).limit(1);

    if (error) {
      broken += 1;
      console.log(`WRONG    ${demo.dir} — ${table}`);
      console.log(`         ${columns.slice(0, 90)}`);
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
