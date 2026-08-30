import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { buildUsageMap, MEDIA_REFERENCES } from "@/lib/media/usage";

/**
 * What the delete confirmation says a file is being used as.
 *
 * The dialog exists because every media foreign key is `on delete set null`:
 * deleting an asset never fails, it silently blanks an image somewhere. So the
 * sentence in that dialog is the only thing standing between the owner and
 * that damage, and it has two ways of being wrong — the count, and the list of
 * places it counted.
 *
 * **The coverage test below found the second one.** `MEDIA_REFERENCES` listed
 * ten columns; the schema has seventeen. The favicon, the site's default social
 * image, a page's, a category's, a technology's logo, a testimonial's portrait
 * and the SEO default were all missing — so deleting a file used as any of them
 * would have shown "used nowhere" and blanked it.
 */

const MIGRATIONS = resolve(process.cwd(), "supabase/migrations");

/**
 * Every `references company.media(id)` in the schema, as `table.column`.
 *
 * Read from the migrations rather than from the generated types, because the
 * types record that a column is a `uuid` and not what it points at. The
 * migrations are the only place the relationship is written down.
 */
function mediaForeignKeys(): string[] {
  const found: string[] = [];

  for (const file of readdirSync(MIGRATIONS).filter((name) => name.endsWith(".sql"))) {
    const sql = readFileSync(resolve(MIGRATIONS, file), "utf8");

    let table: string | null = null;

    for (const line of sql.split("\n")) {
      const create = /^create table company\.([a-z_]+)/.exec(line);
      if (create) table = create[1];

      if (line.includes("references company.media(id)")) {
        const column = /^\s*([a-z_]+)\s+uuid/.exec(line);
        if (table && column) found.push(`${table}.${column[1]}`);
      }
    }
  }

  return [...new Set(found)];
}

describe("the list of places an asset can be used", () => {
  const schema = mediaForeignKeys();
  const listed = MEDIA_REFERENCES.map((r) => `${r.table}.${r.column}`);

  it("finds a plausible number of references in the migrations", () => {
    // Guards the parser. If the migrations change shape this finds nothing,
    // and every assertion below would pass by comparing two empty sets.
    expect(schema.length).toBeGreaterThan(10);
  });

  it("covers every media foreign key in the schema", () => {
    const missing = schema.filter((key) => !listed.includes(key));

    expect(
      missing,
      `deleting a file used as one of these would say "used nowhere": ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("names no column the schema does not have", () => {
    // The other direction: a renamed or dropped column left here makes the
    // usage query fail outright at that column, and the map comes back short.
    const unknown = listed.filter((key) => !schema.includes(key));

    expect(unknown, `not in the schema: ${unknown.join(", ")}`).toEqual([]);
  });

  it("gives every reference a phrase that says what the asset is", () => {
    for (const reference of MEDIA_REFERENCES) {
      // Not the column name. "og_image_id" in a confirmation dialog tells the
      // owner nothing about what will go blank.
      expect(reference.label).not.toContain("_id");
      expect(reference.label.length).toBeGreaterThan(5);
    }
  });

  it("lists each column once", () => {
    expect(new Set(listed).size).toBe(listed.length);
  });
});

describe("buildUsageMap", () => {
  it("counts one use in one place", () => {
    const map = buildUsageMap([{ label: "a team photo", ids: ["a"] }]);

    expect(map.get("a")).toEqual({ total: 1, places: ["a team photo"] });
  });

  it("says '2 ×' rather than repeating the phrase", () => {
    /*
      A dialog that lists "a case study's header image" twice reads as a bug
      and gets dismissed unread. The count belongs in the phrase.
    */
    const map = buildUsageMap([
      { label: "a case study's header image", ids: ["a", "a"] },
    ]);

    expect(map.get("a")).toEqual({
      total: 2,
      places: ["2 × a case study's header image"],
    });
  });

  it("adds up across columns, keeping one phrase for each", () => {
    const map = buildUsageMap([
      { label: "a post's featured image", ids: ["a", "a", "b"] },
      { label: "the light logo", ids: ["a"] },
    ]);

    expect(map.get("a")).toEqual({
      total: 3,
      places: ["2 × a post's featured image", "the light logo"],
    });
    expect(map.get("b")).toEqual({ total: 1, places: ["a post's featured image"] });
  });

  it("leaves an unused asset out of the map entirely", () => {
    // The caller reads a missing entry as "used nowhere", which is what lets
    // the dialog be shorter for the common case.
    const map = buildUsageMap([{ label: "a team photo", ids: [] }]);

    expect(map.size).toBe(0);
  });

  it("skips a column whose read failed rather than counting it as zero", () => {
    /*
      The one wrong answer that matters. A column this cannot speak for must
      not become "used nowhere" — that is the sentence somebody deletes on.
      The count comes back short, which is a smaller lie than a confident one,
      and the query logs the failure beside it.
    */
    const map = buildUsageMap([
      null,
      { label: "a team photo", ids: ["a"] },
    ]);

    expect(map.get("a")?.total).toBe(1);
    expect(map.get("a")?.places).toEqual(["a team photo"]);
  });

  it("returns an empty map when every read failed", () => {
    expect(buildUsageMap([null, null]).size).toBe(0);
  });
});
