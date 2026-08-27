#!/usr/bin/env node
/**
 * Generate `src/types/database.ts` from the live PostgREST schema.
 *
 *   npm run db:types
 *
 * Why this exists rather than `supabase gen types`: the official CLI needs
 * either a Personal Access Token or the database password. PostgREST already
 * publishes a complete OpenAPI description of the schema, readable with the
 * secret key we hold, and it carries everything the types need — column
 * types, nullability, defaults and enum members.
 *
 * Switch to `supabase gen types typescript --linked` once the CLI is linked;
 * the output shape here is deliberately compatible, so nothing downstream
 * changes when that happens.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMA = "company";
const OUT = resolve(ROOT, "src/types/database.ts");

// --- environment ------------------------------------------------------------

function loadEnv() {
  const env = {};
  try {
    const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (match) env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // Fall through to process.env — CI passes them directly.
  }
  return { ...env, ...process.env };
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

// --- fetch ------------------------------------------------------------------

const response = await fetch(`${url}/rest/v1/`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Accept-Profile": SCHEMA,
  },
});

if (!response.ok) {
  console.error(`Schema fetch failed: HTTP ${response.status}`);
  console.error(await response.text());
  process.exit(1);
}

const spec = await response.json();
const definitions = spec.definitions ?? {};

if (Object.keys(definitions).length === 0) {
  console.error(
    `No tables found. Is "${SCHEMA}" listed under Exposed schemas in the Supabase dashboard?`,
  );
  process.exit(1);
}

// --- type mapping -----------------------------------------------------------

const enums = new Map(); // company.project_type -> ["inhouse", ...]

function tsType(column) {
  // Enum columns carry both a members list and a qualified format name.
  if (Array.isArray(column.enum) && column.format?.startsWith(`${SCHEMA}.`)) {
    const name = column.format.slice(SCHEMA.length + 1);
    enums.set(name, column.enum);
    return `Database["${SCHEMA}"]["Enums"]["${name}"]`;
  }

  switch (column.format) {
    case "uuid":
    case "text":
    case "timestamp with time zone":
    case "timestamp without time zone":
    case "date":
    case "time without time zone":
      return "string";
    case "int32":
    case "int64":
    case "numeric":
    case "double precision":
    case "real":
    case "smallint":
      return "number";
    case "boolean":
      return "boolean";
    case "jsonb":
    case "json":
      return "Json";
    case "text[]":
      return "string[]";
    case "uuid[]":
      return "string[]";
    default:
      // Unrecognised type: fall back to the JSON Schema primitive rather than
      // silently emitting `any`, and warn so the mapping can be extended.
      console.warn(`  ! unmapped format "${column.format}" -> using ${column.type ?? "unknown"}`);
      return column.type === "integer" || column.type === "number"
        ? "number"
        : column.type === "boolean"
          ? "boolean"
          : column.type === "string"
            ? "string"
            : "unknown";
  }
}

// --- emit -------------------------------------------------------------------

const tableNames = Object.keys(definitions).sort();
const tableBlocks = [];

/**
 * PostgREST records foreign keys in the column description, as
 * `<fk table='pages' column='id'/>`.
 *
 * These become the `Relationships` entries that supabase-js needs in order to
 * type an embedded select — without them, `pages.select("*, page_sections(*)")`
 * resolves to `SelectQueryError` rather than the joined shape.
 *
 * Relationships are declared on the table holding the foreign key. The client
 * resolves the reverse direction by searching every table for one that points
 * back, so a parent table needs no entry of its own.
 */
const FK_PATTERN = /<fk table='([^']+)' column='([^']+)'\s*\/>/;

function foreignKey(column) {
  const match = FK_PATTERN.exec(column.description ?? "");
  if (!match) return null;

  // Cross-schema references arrive schema-qualified. Only same-schema targets
  // can be embedded, so anything not in this schema is skipped rather than
  // emitted as a relation to a table the types do not contain.
  const target = match[1].includes(".") ? match[1].split(".").pop() : match[1];
  if (!definitions[target]) return null;

  return { table: target, column: match[2] };
}

for (const table of tableNames) {
  const def = definitions[table];
  const properties = def.properties ?? {};
  const required = new Set(def.required ?? []);
  const columns = Object.keys(properties);
  const relationships = [];

  const row = [];
  const insert = [];
  const update = [];

  for (const name of columns) {
    const column = properties[name];
    const type = tsType(column);

    const isNullable = !required.has(name);
    const hasDefault = column.default !== undefined;

    // Row: nullability mirrors the database exactly.
    row.push(`          ${name}: ${type}${isNullable ? " | null" : ""}`);

    // Insert: optional when the database can supply the value itself, either
    // because the column is nullable or because it has a default.
    const insertOptional = isNullable || hasDefault;
    insert.push(
      `          ${name}${insertOptional ? "?" : ""}: ${type}${isNullable ? " | null" : ""}`,
    );

    // Update: every column optional, by definition of a partial update.
    update.push(`          ${name}?: ${type}${isNullable ? " | null" : ""}`);

    const fk = foreignKey(column);
    if (fk) {
      relationships.push(
        [
          `          {`,
          `            foreignKeyName: "${table}_${name}_fkey"`,
          `            columns: ["${name}"]`,
          `            isOneToOne: false`,
          `            referencedRelation: "${fk.table}"`,
          `            referencedColumns: ["${fk.column}"]`,
          `          }`,
        ].join("\n"),
      );
    }
  }

  tableBlocks.push(
    [
      `      ${table}: {`,
      `        Row: {`,
      row.join("\n"),
      `        }`,
      `        Insert: {`,
      insert.join("\n"),
      `        }`,
      `        Update: {`,
      update.join("\n"),
      `        }`,
      relationships.length
        ? `        Relationships: [\n${relationships.join(",\n")}\n        ]`
        : `        Relationships: []`,
      `      }`,
    ].join("\n"),
  );
}

const enumBlock = [...enums.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([name, members]) => `      ${name}: ${members.map((m) => `"${m}"`).join(" | ")}`)
  .join("\n");

const output = `// Generated file — do not edit by hand.
// Regenerate with: npm run db:types
//
// Source: the live PostgREST schema description for the "${SCHEMA}" schema.
// Every change to supabase/migrations must be followed by a regeneration, or
// the types here will quietly disagree with the database.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  ${SCHEMA}: {
    Tables: {
${tableBlocks.join("\n")}
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: {
${enumBlock}
    }
    CompositeTypes: Record<never, never>
  }
};

// --- convenience aliases ----------------------------------------------------

type Schema = Database["${SCHEMA}"];

export type Tables<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Schema["Tables"]> = Schema["Tables"][T]["Update"];
export type Enums<T extends keyof Schema["Enums"]> = Schema["Enums"][T];
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, output, "utf8");

console.log(`Wrote ${OUT}`);
console.log(`  ${tableNames.length} tables, ${enums.size} enums`);
