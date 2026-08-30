import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import TABLES from "@/lib/backup/tables.json";

/**
 * The backup covers every table in the schema.
 *
 * This is the test the backup exists for. A table added to the database and
 * not added to the list is a table that **silently stops being backed up**, and
 * nobody finds out until the day somebody needs a restore — which is the worst
 * possible day to find out. Nothing else would fail: the script would run, say
 * "24 tables", and upload a file that looks exactly like a good one.
 *
 * The comparison is against `src/types/database.ts`, which is generated from
 * the live schema by `npm run db:types`. So the sequence that catches it is the
 * one that actually happens: somebody writes a migration, runs the type
 * generator, and this test goes red before their next commit.
 *
 * Read as text rather than imported, because the table names are a TypeScript
 * *type* and types do not exist at runtime. The regex matches the shape the
 * generator emits and is asserted to find a plausible number of tables, so a
 * change in that shape fails loudly instead of quietly matching nothing and
 * passing.
 */

const GENERATED = resolve(process.cwd(), "src/types/database.ts");

/**
 * Tables that are deliberately not in the backup.
 *
 * Empty today, and the list exists so that an exclusion has to be written down
 * with a reason rather than achieved by leaving something out.
 */
const EXCLUDED: string[] = [];

function tablesInSchema(): string[] {
  const source = readFileSync(GENERATED, "utf8");

  // The generator emits each table as `      name: {` followed by `Row: {`,
  // nested under the schema's `Tables` block at a fixed indent.
  const names = [...source.matchAll(/^ {6}([a-z_]+): \{$/gm)].map((match) => match[1]);

  return [...new Set(names)];
}

describe("the backup's table list", () => {
  const schema = tablesInSchema();

  it("reads a plausible number of tables out of the generated types", () => {
    // Guards the regex itself. If the generator changes shape this finds
    // nothing, and every assertion below would pass by comparing two empty
    // sets — a green test that checks nothing at all.
    expect(schema.length).toBeGreaterThan(15);
  });

  it("covers every table in the schema", () => {
    const missing = schema.filter(
      (table) => !TABLES.includes(table) && !EXCLUDED.includes(table),
    );

    expect(
      missing,
      `these tables are in the schema and would not be backed up: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("names no table that is not in the schema", () => {
    // The other direction. A renamed or dropped table left in the list makes
    // the backup fail outright at that table — loudly, which is the right
    // failure, but this catches it before it runs at 3am.
    const unknown = TABLES.filter((table) => !schema.includes(table));

    expect(
      unknown,
      `these are in the backup list and not in the schema: ${unknown.join(", ")}`,
    ).toEqual([]);
  });

  it("lists each table once", () => {
    expect(new Set(TABLES).size).toBe(TABLES.length);
  });

  it("puts media and roles before the rows that reference them", () => {
    // The list is also a restore order, so a foreign key must never point at a
    // row that has not been inserted yet. These two are the ones everything
    // else hangs off.
    expect(TABLES.indexOf("media")).toBeLessThan(TABLES.indexOf("site_settings"));
    expect(TABLES.indexOf("roles")).toBeLessThan(TABLES.indexOf("profiles"));
    expect(TABLES.indexOf("pages")).toBeLessThan(TABLES.indexOf("page_sections"));
    expect(TABLES.indexOf("leads")).toBeLessThan(TABLES.indexOf("lead_notes"));
    expect(TABLES.indexOf("blog_categories")).toBeLessThan(TABLES.indexOf("blog_posts"));
  });
});
