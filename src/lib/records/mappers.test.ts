import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import * as faqs from "@/lib/records/faqs";
import * as media from "@/lib/records/media";
import * as pricing from "@/lib/records/pricing";
import * as team from "@/lib/records/team";

/**
 * The record mappers, both ways.
 *
 * Every content screen is the same two functions: a row turned into the form's
 * values, and validated values turned back into columns. They are pure, they
 * are short, and they are **the place a column gets silently dropped** — a
 * field left out of the second one is a field the owner edits, saves, and
 * watches revert, with nothing failing anywhere.
 *
 * Two things are checked here, and the second is the one that keeps working
 * after today.
 *
 * **The round trip.** A row through both functions comes back as itself. That
 * catches a mapper that reads one column and writes another, or that loses a
 * value's shape on the way through — an empty string where the column wants
 * null, a number read as a string.
 *
 * **The coverage.** Every column in the generated database types is either
 * written by the mapper or named in this file as deliberately not editable.
 * That is what catches the failure a round trip cannot: a *new* column, added
 * by a migration, that no form has ever offered. The round trip would pass
 * happily, because it only ever tests the columns somebody remembered.
 */

const GENERATED = resolve(process.cwd(), "src/types/database.ts");

/** Every column of one table, read out of the generated types. */
function columnsOf(table: string): string[] {
  const source = readFileSync(GENERATED, "utf8");

  const start = source.indexOf(`      ${table}: {`);
  if (start < 0) throw new Error(`${table} is not in the generated types`);

  const row = source.indexOf("Row: {", start);
  const end = source.indexOf("        }", row);

  return source
    .slice(row + "Row: {".length, end)
    .split("\n")
    .map((line) => line.trim().split(":")[0])
    .filter((name) => /^[a-z_]+$/.test(name));
}

/**
 * Columns no form writes, and why.
 *
 * Every entry is a deliberate exclusion rather than an oversight, which is the
 * point of writing them down: adding a column to this list is a decision
 * somebody makes, and leaving one out of a mapper is a mistake nobody notices.
 */
const NOT_EDITABLE: Record<string, string[]> = {
  // `sort_order` is set by the arrows on the list; `published_at` by the
  // status change; the rest are the database's own.
  pricing_plans: ["id", "sort_order", "published_at", "created_at", "updated_at"],
  team_members: ["id", "sort_order", "published_at", "created_at", "updated_at"],
  faqs: ["id", "sort_order", "created_at", "updated_at"],
  // Everything a file *is* rather than what it is called: measured at upload
  // and never editable afterwards, because changing them would make the row
  // disagree with the bytes in the bucket.
  media: [
    "id",
    "r2_key",
    "mime_type",
    "size_bytes",
    "width",
    "height",
    "blurhash",
    "uploaded_by",
    "created_at",
    "updated_at",
  ],
};

describe("pricing", () => {
  const row = {
    id: "1",
    slug: "starter",
    name: "Starter",
    tagline: "For a first site",
    price_from: 45000,
    currency: "INR",
    price_note: "plus GST",
    is_custom_quote: false,
    features: ["Five pages", "Contact form"],
    is_highlighted: true,
    cta_label: "Start here",
    cta_href: "/request-a-quote",
    sort_order: 1,
    status: "published",
    published_at: "2026-08-01T00:00:00Z",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  } as unknown as pricing.PricingPlanRow;

  it("round-trips a full row", () => {
    const back = pricing.valuesToRow(pricing.planToValues(row));

    expect(back).toMatchObject({
      name: "Starter",
      slug: "starter",
      tagline: "For a first site",
      price_from: 45000,
      currency: "INR",
      price_note: "plus GST",
      is_custom_quote: false,
      is_highlighted: true,
      cta_label: "Start here",
      cta_href: "/request-a-quote",
      status: "published",
    });
    expect(back.features).toEqual(["Five pages", "Contact form"]);
  });

  it("keeps a cleared price as null, not zero", () => {
    /*
      The difference between "ask us" and "free", on a price card.

      An empty number input reads as `undefined`, and anything that coerced it
      would write 0 — which the public page would render as a price.
    */
    const noPrice = { ...row, price_from: null } as unknown as pricing.PricingPlanRow;
    const back = pricing.valuesToRow(pricing.planToValues(noPrice));

    expect(back.price_from).toBeNull();
  });

  it("falls back to a call to action rather than writing an empty one", () => {
    // A card with a blank button is worse than one with a generic button.
    const back = pricing.valuesToRow({ ...pricing.planToValues(row), cta_label: "", cta_href: "" });

    expect(back.cta_label).toBe("Request a Quote");
    expect(back.cta_href).toBe("/request-a-quote");
  });

  it("writes every editable column", () => {
    const written = Object.keys(pricing.valuesToRow(pricing.planToValues(row)));
    const missing = columnsOf("pricing_plans").filter(
      (column) => !written.includes(column) && !NOT_EDITABLE.pricing_plans.includes(column),
    );

    expect(missing, `no form writes: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("faqs", () => {
  const row = {
    id: "1",
    question: "Do we own the code?",
    answer: "Yes. It is handed over at the end.",
    scope: ["home", "pricing"],
    sort_order: 3,
    is_active: true,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  } as unknown as faqs.FaqRow;

  it("round-trips a full row", () => {
    expect(faqs.valuesToRow(faqs.faqToValues(row))).toMatchObject({
      question: "Do we own the code?",
      answer: "Yes. It is handed over at the end.",
      scope: ["home", "pricing"],
      is_active: true,
    });
  });

  it("keeps a question that belongs to no page", () => {
    // Stored but shown nowhere is a legitimate state, and the form says so.
    const orphan = { ...row, scope: [] } as unknown as faqs.FaqRow;

    expect(faqs.valuesToRow(faqs.faqToValues(orphan)).scope).toEqual([]);
  });

  it("writes every editable column", () => {
    const written = Object.keys(faqs.valuesToRow(faqs.faqToValues(row)));
    const missing = columnsOf("faqs").filter(
      (column) => !written.includes(column) && !NOT_EDITABLE.faqs.includes(column),
    );

    expect(missing, `no form writes: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("team", () => {
  const row = {
    id: "1",
    name: "Nitish Kumar",
    role: "Founder",
    bio: "Builds the software.",
    photo_id: "photo-1",
    linkedin_url: "https://linkedin.com/in/x",
    github_url: "https://github.com/x",
    skills: ["TypeScript", "Postgres"],
    sort_order: 1,
    status: "published",
    published_at: null,
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  } as unknown as team.TeamMemberRow;

  it("round-trips a full row", () => {
    expect(team.valuesToRow(team.memberToValues(row))).toMatchObject({
      name: "Nitish Kumar",
      role: "Founder",
      bio: "Builds the software.",
      photo_id: "photo-1",
      linkedin_url: "https://linkedin.com/in/x",
      github_url: "https://github.com/x",
      skills: ["TypeScript", "Postgres"],
      status: "published",
    });
  });

  it("stores a cleared optional field as absent, not as a blank", () => {
    /*
      An empty string in a nullable column is a value that looks absent and is
      not: the page's `??` fallback never fires and the block renders empty
      instead of being left out.
    */
    const bare = { ...row, bio: null, photo_id: null, linkedin_url: null, github_url: null } as unknown as team.TeamMemberRow;
    const back = team.valuesToRow(team.memberToValues(bare));

    expect(back.bio).toBeNull();
    expect(back.photo_id).toBeNull();
    expect(back.linkedin_url).toBeNull();
    expect(back.github_url).toBeNull();
  });

  it("writes every editable column", () => {
    const written = Object.keys(team.valuesToRow(team.memberToValues(row)));
    const missing = columnsOf("team_members").filter(
      (column) => !written.includes(column) && !NOT_EDITABLE.team_members.includes(column),
    );

    expect(missing, `no form writes: ${missing.join(", ")}`).toEqual([]);
  });
});

describe("media", () => {
  const row = {
    id: "asset-1",
    r2_key: "media/asset-1/logo.svg",
    public_url: "/media/asset-1/logo.svg",
    filename: "logo.svg",
    mime_type: "image/svg+xml",
    size_bytes: 2048,
    width: 512,
    height: 512,
    alt_text: "The company mark",
    caption: "On a light background",
    folder: "brand",
    blurhash: null,
    dark_variant_id: "asset-2",
    attribution: "Drawn in-house",
    uploaded_by: "user-1",
    created_at: "2026-08-01T00:00:00Z",
    updated_at: "2026-08-01T00:00:00Z",
  } as unknown as media.MediaRow;

  it("round-trips a full row", () => {
    expect(media.valuesToRow(row.id, row.filename, media.mediaToValues(row))).toMatchObject({
      alt_text: "The company mark",
      caption: "On a light background",
      attribution: "Drawn in-house",
      filename: "logo.svg",
      folder: "brand",
      dark_variant_id: "asset-2",
    });
  });

  it("rewrites the address when the filename changes", () => {
    // The name is carried in the URL for whoever reads the link; only the id
    // in front of it resolves, so a rename is cosmetic and breaks nothing.
    const back = media.valuesToRow(row.id, row.filename, {
      ...media.mediaToValues(row),
      filename: "brand-mark.svg",
    });

    expect(back.public_url).toBe(media.mediaPath(row.id, "brand-mark.svg"));
    expect(back.public_url).toContain(row.id);
  });

  it("falls back to a folder rather than writing none", () => {
    expect(media.valuesToRow(row.id, row.filename, { ...media.mediaToValues(row), folder: "" }).folder).toBe(
      "general",
    );
  });

  it("writes every editable column", () => {
    const written = Object.keys(media.valuesToRow(row.id, row.filename, media.mediaToValues(row)));
    const missing = columnsOf("media").filter(
      (column) => !written.includes(column) && !NOT_EDITABLE.media.includes(column),
    );

    expect(missing, `no form writes: ${missing.join(", ")}`).toEqual([]);
  });
});
