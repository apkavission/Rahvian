/**
 * Which migrations have actually been applied, across the whole estate.
 *
 * ---------------------------------------------------------------------------
 * **Why this exists.** Nothing in this estate records that a migration was run.
 * The convention is that the owner pastes SQL into the Supabase editor, and the
 * only evidence afterwards is the schema itself. So "have we run that one?" has
 * been answered from memory — and it was wrong at least once, when three
 * portal migrations were believed applied and were not, and every screen built
 * on them failed on a missing column.
 *
 * So this reads each migration file, works out what it was supposed to create,
 * and asks the database whether those things are there.
 *
 * ---------------------------------------------------------------------------
 * **What it can and cannot see, stated plainly.**
 *
 * It checks **schemas, tables, columns, views and functions**, because those can
 * be looked up in the catalogue by name. A migration whose objects are all
 * present is reported as applied.
 *
 * It does **not** check policies, triggers, constraints, indexes or data. A
 * migration that creates a table and six policies, run half-way, would be
 * reported as applied. That is a real limit and the reason `check:policies`
 * exists separately: this answers "has it been run", not "is it correct".
 *
 * A file that creates nothing checkable — only policies, or only seed rows —
 * is reported as `unknown` rather than as applied, because claiming to have
 * verified something unverifiable is worse than admitting the gap.
 */
import pg from "pg";
import { readFileSync, readdirSync, existsSync } from "node:fs";

const PROJECTS = [
  { name: "services", dir: "c:/Users/kumar/services" },
  { name: "portal", dir: "c:/Users/kumar/portal" },
  { name: "demo-clinic", dir: "c:/Users/kumar/demo-clinic" },
  { name: "demo-restaurant", dir: "c:/Users/kumar/demo-restaurant" },
  { name: "demo-school", dir: "c:/Users/kumar/demo-school" },
  { name: "demo-realestate", dir: "c:/Users/kumar/demo-realestate" },
  { name: "demo-crm", dir: "c:/Users/kumar/demo-crm" },
];

const config = Object.fromEntries(
  readFileSync("c:/Users/kumar/portal/.env.local", "utf8")
    .split(/\r?\n/)
    .map((line) => /^([A-Z_]+)=(.*)$/.exec(line.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);

const ref = new URL(config.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

const client = new pg.Client({
  host: `aws-0-${config.SUPABASE_REGION ?? "ap-south-1"}.pooler.supabase.com`,
  port: 5432,
  user: `postgres.${ref}`,
  password: config.SUPABASE_DB_PASSWORD,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});

await client.connect();

/* ------------------------------------------------------------------ what is */

const { rows: tables } = await client.query(
  `select table_schema, table_name from information_schema.tables
    where table_schema not in ('pg_catalog','information_schema')`,
);
const { rows: columns } = await client.query(
  `select table_schema, table_name, column_name from information_schema.columns
    where table_schema not in ('pg_catalog','information_schema')`,
);
const { rows: routines } = await client.query(
  `select n.nspname as schema, p.proname as name
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog','information_schema')`,
);
const { rows: schemas } = await client.query(
  "select nspname from pg_namespace where nspname not like 'pg_%'",
);

const haveTable = new Set(tables.map((r) => `${r.table_schema}.${r.table_name}`));
const haveColumn = new Set(
  columns.map((r) => `${r.table_schema}.${r.table_name}.${r.column_name}`),
);
const haveRoutine = new Set(routines.map((r) => `${r.schema}.${r.name}`));
const haveSchema = new Set(schemas.map((r) => r.nspname));

/* ---------------------------------------------------------- what was wanted */

function wanted(sql) {
  const objects = [];

  for (const [, name] of sql.matchAll(/create schema if not exists\s+([a-z_][a-z0-9_]*)/gi)) {
    objects.push({ kind: "schema", name });
  }

  for (const [, name] of sql.matchAll(
    /create table if not exists\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/gi,
  )) {
    objects.push({ kind: "table", name });
  }

  /* `alter table X add column if not exists a, add column if not exists b` —
     one statement, several columns, so the table is captured and then each
     column found inside that statement. */
  for (const match of sql.matchAll(
    /alter table\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)([\s\S]*?);/gi,
  )) {
    const table = match[1];
    for (const [, column] of match[2].matchAll(/add column if not exists\s+([a-z_][a-z0-9_]*)/gi)) {
      objects.push({ kind: "column", name: `${table}.${column}` });
    }
  }

  for (const [, name] of sql.matchAll(
    /create or replace (?:function|view)\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/gi,
  )) {
    objects.push({ kind: name.includes(".") ? "routine" : "routine", name });
  }

  return objects;
}

function present(object) {
  if (object.kind === "schema") return haveSchema.has(object.name);
  if (object.kind === "table") return haveTable.has(object.name);
  if (object.kind === "column") return haveColumn.has(object.name);
  return haveRoutine.has(object.name) || haveTable.has(object.name);
}

/**
 * Things a later migration deliberately removed.
 *
 * `demo_clinic.redeem_share_link` was created by one migration and dropped by
 * the next, once it turned out to be doing two jobs. Its absence is the correct
 * state — but to a checker looking only at "is it there", the migration that
 * created it looks unapplied.
 *
 * Reported as a false alarm the first time this ran, which is exactly the kind
 * of wrong answer that teaches people to ignore a check.
 */
function dropped(allSql) {
  const names = new Set();

  for (const [, name] of allSql.matchAll(
    /drop (?:function|view|table)\s+if exists\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/gi,
  )) {
    names.add(name);
  }

  return names;
}

/* ------------------------------------------------------------------ report */

const pending = [];
let applied = 0;
let unknown = 0;

for (const project of PROJECTS) {
  const dir = `${project.dir}/supabase/migrations`;
  if (!existsSync(dir)) continue;

  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const lines = [];

  /* Read the whole project's SQL first, so a migration is not reported as
     pending because something it created was later removed on purpose. */
  const everySql = files
    .map((f) => readFileSync(`${dir}/${f}`, "utf8"))
    .join(String.fromCharCode(10));

  const removed = dropped(everySql);

  for (const file of files) {
    const sql = readFileSync(`${dir}/${file}`, "utf8");
    const objects = wanted(sql);

    if (objects.length === 0) {
      unknown += 1;
      lines.push(`  ?  ${file}  (creates nothing this can check — see the note above)`);
      continue;
    }

    const missing = objects.filter(
      (object) => !present(object) && !removed.has(object.name),
    );

    if (missing.length === 0) {
      applied += 1;
      lines.push(`  ok ${file}`);
    } else {
      pending.push({ project: project.name, file, missing });
      lines.push(
        `  NO ${file}  — missing: ${missing.slice(0, 4).map((m) => m.name).join(", ")}${missing.length > 4 ? ` and ${missing.length - 4} more` : ""}`,
      );
    }
  }

  console.log(`\n${project.name}`);
  for (const line of lines) console.log(line);
}

console.log("\n" + "-".repeat(64));
console.log(`${applied} migrations applied · ${unknown} not checkable · ${pending.length} still to run`);

if (pending.length > 0) {
  console.log("\nStill to run, in this order:\n");
  for (const entry of pending) {
    console.log(`  ${entry.project}/supabase/migrations/${entry.file}`);
  }
  process.exitCode = 1;
}

await client.end();
