/**
 * The company's own name, changed in the one place the site reads it from.
 *
 * ---------------------------------------------------------------------------
 * **The owner's instruction, 2026-09-11.**
 *
 *   > apne company ka naam jo h RAHVIAN TECHNOLOGIES PRIVATE LIMITED ye mila h
 *   > to ye use karna h … apka saathi wala hata dena … sab project me dekh lena
 *
 * The code was renamed in the same change. This is the other half, and it is
 * the half that matters: **almost nothing on this site says its own name from
 * code.** The header, the footer, every page title, every email and the
 * Organization document all read `company.site_settings` and
 * `company.seo_defaults`. Renaming the fallbacks in the components changes what
 * a visitor sees only if the database cannot be read at all.
 *
 * ---------------------------------------------------------------------------
 * **Why a script and not a migration.** A migration is for schema. Every change
 * here is content — rows a person could edit in the admin panel, and two of
 * them are rows a person *should* edit there rather than in SQL. What the
 * migration beside this does is change the column *defaults*, so a fresh
 * install is born with the right name; this is what fixes the install that
 * already exists.
 *
 * **It is safe to run twice.** Every statement is a replace of a known old
 * string or a delete of a row that may already be gone.
 *
 * ---------------------------------------------------------------------------
 * **What it deliberately does not touch.**
 *
 * `company.leads` holds one real enquiry, and the consent text stored beside it
 * records what that person actually agreed to, under the name the company had
 * at the time. Rewriting it would be editing a record of somebody's consent,
 * which is not a rename — so the row is left exactly as it is and reported at
 * the end.
 *
 * The owner's email address, the GitHub organisation and the git author are
 * real identifiers outside this database and are not this script's business.
 *
 * Run it with the estate's service key in `.env.local`:
 *
 *     node scripts/rename-to-rahvian.mjs --dry-run
 *     node scripts/rename-to-rahvian.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DRY = process.argv.includes("--dry-run");

const OLD_BRAND = "Apka Vission";
const OLD_LEGAL = "Apka Saathi Private Limited";
const OLD_PRODUCT = "Apka Saathi";
const NEW_BRAND = "Rahvian";
const NEW_LEGAL = "Rahvian Technologies Private Limited";

/** Ordered longest-first, so the legal name is never half-replaced. */
const TEXT = [
  [OLD_LEGAL, NEW_LEGAL],
  [OLD_BRAND, NEW_BRAND],
  [OLD_PRODUCT, NEW_BRAND],
  ["apka-vission", "rahvian"],
];

function env(key) {
  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
  const line = lines.find((entry) => entry.startsWith(key + "="));
  return line ? line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "") : undefined;
}

const db = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  db: { schema: "company" },
  auth: { persistSession: false },
});

let changed = 0;
const say = (...args) => console.log(...args);

/** Replace the old names anywhere in a row, and write back only what moved. */
function rename(value) {
  if (typeof value === "string") {
    let out = value;
    for (const [old, now] of TEXT) out = out.split(old).join(now);
    return out;
  }

  if (Array.isArray(value)) return value.map(rename);

  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rename(v)]));
  }

  return value;
}

/**
 * Rewrite every row of a table whose text mentions the old names.
 *
 * The whole row is read, renamed and compared rather than patched column by
 * column, because most of what carries the name here is inside `jsonb` — a
 * band's heading, a feature's body, a legal clause. A column list would have
 * to know the shape of every section type, and a new section type would quietly
 * escape it.
 */
async function renameTable(table, { columns = null, idColumn = "id" } = {}) {
  const { data, error } = await db.from(table).select("*");

  if (error) {
    say(`! ${table}: ${error.message}`);
    return;
  }

  for (const row of data ?? []) {
    const patch = {};

    for (const [key, value] of Object.entries(row)) {
      if (key === idColumn) continue;
      if (columns && !columns.includes(key)) continue;

      const renamed = rename(value);
      if (JSON.stringify(renamed) !== JSON.stringify(value)) patch[key] = renamed;
    }

    if (Object.keys(patch).length === 0) continue;

    say(`  ${table}/${row[idColumn]}: ${Object.keys(patch).join(", ")}`);
    changed += 1;

    if (DRY) continue;

    const { error: wrote } = await db.from(table).update(patch).eq(idColumn, row[idColumn]);
    if (wrote) say(`  ! could not write ${table}/${row[idColumn]}: ${wrote.message}`);
  }
}

/* =============================================================== the name == */

say(DRY ? "Dry run — nothing will be written.\n" : "Renaming.\n");

say("The two rows the whole site reads its name from:");
await renameTable("site_settings");
await renameTable("seo_defaults");

say("\nContent:");
await renameTable("pages");
await renameTable("page_sections");
await renameTable("services");
await renameTable("case_studies");
await renameTable("pricing_plans");
await renameTable("faqs");
await renameTable("testimonials");
/* Alt text and filenames of the brand files. The pictures themselves still
   spell the old name in outlines — see the note printed at the end. */
await renameTable("media");

/* =========================================================== the product == */

say("\nThe product that was removed:");

/*
  Its page row is `is_system`, which a trigger protects from deletion — the
  flag exists so nobody deletes the front page by accident. The flag has to be
  lifted before the row will go, and that is the whole reason this is a
  deliberate script rather than a delete in the panel.
*/
const { data: productPage } = await db
  .from("pages")
  .select("id, slug")
  .eq("slug", "products-apka-saathi")
  .maybeSingle();

if (productPage) {
  say(`  pages/${productPage.slug} and its bands`);
  changed += 1;

  if (!DRY) {
    await db.from("page_sections").delete().eq("page_id", productPage.id);
    await db.from("pages").update({ is_system: false }).eq("id", productPage.id);
    const { error } = await db.from("pages").delete().eq("id", productPage.id);
    if (error) say(`  ! the page row would not delete: ${error.message}`);
  }
} else {
  say("  the page row is already gone");
}

/* The two menu entries that pointed at it, in the header and the footer. */
const { data: navRows } = await db
  .from("nav_items")
  .select("id, label, location")
  .like("href", "%/products/apka-saathi%");

for (const row of navRows ?? []) {
  say(`  nav_items/${row.location}: "${row.label}"`);
  changed += 1;
  if (!DRY) await db.from("nav_items").delete().eq("id", row.id);
}

/* The promo band on the home page, which advertised it. */
const { data: promo } = await db.from("page_sections").select("id, type").eq("type", "product_promo");

for (const row of promo ?? []) {
  say(`  page_sections/${row.id}: the product promo band`);
  changed += 1;
  if (!DRY) await db.from("page_sections").delete().eq("id", row.id);
}

/* And the portfolio entry that showed it as our own work. */
const { data: project } = await db
  .from("projects")
  .select("id, slug, title")
  .eq("slug", "apka-saathi")
  .maybeSingle();

if (project) {
  say(`  projects/${project.slug}: "${project.title}"`);
  changed += 1;
  if (!DRY) await db.from("projects").delete().eq("id", project.id);
} else {
  say("  the portfolio entry is already gone");
}

/* The remaining portfolio entry is this website, and its slug carried the old
   brand. Renamed above by `renameTable`, which reaches `slug` as well as the
   prose — so `/portfolio/apka-vission` is now `/portfolio/rahvian`. */
await renameTable("projects");

/* ================================================================== done == */

say(`\n${changed} ${changed === 1 ? "row" : "rows"} ${DRY ? "would change" : "changed"}.`);

const { count: leads } = await db
  .from("leads")
  .select("*", { count: "exact", head: true })
  .ilike("consent_text", "%Apka%");

if (leads) {
  say(
    `\n${leads} lead row${leads === 1 ? "" : "s"} still name${leads === 1 ? "s" : ""} the old company, and that is deliberate: ` +
      "the consent text stored with an enquiry records what that person agreed to, " +
      "under the name the company had when they agreed to it. It is a record, not a label.",
  );
}

say(
  "\nStill to do by hand, because none of it is a database row:\n" +
    "  · the logo files in public/brand spell the old name in vector outlines,\n" +
    "    so they cannot be renamed — they have to be redrawn or replaced, and\n" +
    "    the new one uploaded in the admin under Settings\n" +
    "  · public/brand/logo-email.png, which is what emails and share cards show\n" +
    "  · the domain: apkavission.com and .in were never registered, so the\n" +
    "    decision is now rahvian.com and .in\n" +
    "  · the GitHub organisation, the owner's email address and the git author",
);
