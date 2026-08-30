import { describe, expect, it } from "vitest";
import { FOLDER_PATTERN } from "@/lib/records/media";
import { CTA_HREF_PATTERN, pricingSchema } from "@/lib/records/pricing";
import { PROFILE_URL_PATTERN } from "@/lib/records/team";
import { SLUG_PATTERN } from "@/lib/validation/records";

/**
 * The rules a form refuses on, rather than the shapes it stores.
 *
 * Second on testing.md's list, and worth it for a reason the mappers are not:
 * these are the messages a person actually meets. A pattern that is stricter
 * than the database is a form that refuses something perfectly legal, and one
 * that is looser is a constraint violation arriving as an unreadable database
 * error at the end of filling a page in.
 *
 * The slug rule is the one where that matters most. `SLUG_PATTERN` exists
 * because the database enforces the same expression with a check constraint on
 * every sluggable table, and the two must stay **identical** — a form that
 * accepts what the database refuses is worse than one that refuses too much.
 */

const matches = (pattern: { re: RegExp }, value: string) => pattern.re.test(value);

describe("the slug rule", () => {
  it("accepts what a slug actually looks like", () => {
    for (const slug of ["a", "web-development", "seo", "apka-saathi-2", "123"]) {
      expect(matches(SLUG_PATTERN, slug), slug).toBe(true);
    }
  });

  it("refuses anything that would change what the address means", () => {
    const bad = [
      "",
      "Web-Development", // capitals — two addresses for one page
      "web development", // a space is %20 in a URL
      "web--development", // a doubled hyphen reads as a typo and is not stored
      "-leading",
      "trailing-",
      "web/development", // a slash is another path segment entirely
      "web_development",
      "café",
    ];

    for (const slug of bad) {
      expect(matches(SLUG_PATTERN, slug), slug).toBe(false);
    }
  });

  it("says the same thing as the database's own constraint", () => {
    /*
      The expression, written out. If this test has to change, the migration
      has to change with it — that is the whole reason it is pinned here rather
      than left to be compared by eye across two files.
    */
    expect(SLUG_PATTERN.re.source).toBe("^[a-z0-9]+(?:-[a-z0-9]+)*$");
  });
});

describe("the media folder rule", () => {
  it("accepts a single word", () => {
    for (const folder of ["brand", "services", "team", "case-studies"]) {
      expect(matches(FOLDER_PATTERN, folder), folder).toBe(true);
    }
  });

  it("refuses a path", () => {
    // A folder here is a label on a row, not a directory. A slash in it would
    // suggest a hierarchy the library does not have.
    for (const folder of ["brand/logos", "../brand", "Brand", "my folder", ""]) {
      expect(matches(FOLDER_PATTERN, folder), folder).toBe(false);
    }
  });
});

describe("the pricing call-to-action address", () => {
  it("accepts a page on this site and a real elsewhere", () => {
    for (const href of [
      "/request-a-quote",
      "https://example.com",
      "http://example.com",
      "mailto:info@apkasaathi.com",
      "tel:+919876543210",
    ]) {
      expect(matches(CTA_HREF_PATTERN, href), href).toBe(true);
    }
  });

  it("refuses a bare domain", () => {
    /*
      The failure this prevents is invisible in the form and obvious on the
      page: `example.com` without a scheme is a **relative** link, so it
      resolves against this site and 404s. It looks like a perfectly good
      address right up until somebody clicks it.
    */
    for (const href of ["example.com", "www.example.com", ""]) {
      expect(matches(CTA_HREF_PATTERN, href), href).toBe(false);
    }
  });
});

describe("a team member's profile link", () => {
  it("requires https and refuses a bare handle", () => {
    expect(matches(PROFILE_URL_PATTERN, "https://linkedin.com/in/someone")).toBe(true);
    expect(matches(PROFILE_URL_PATTERN, "http://github.com/someone")).toBe(true);

    // Same trap as the pricing link: a handle renders as a relative URL.
    expect(matches(PROFILE_URL_PATTERN, "linkedin.com/in/someone")).toBe(false);
    expect(matches(PROFILE_URL_PATTERN, "@someone")).toBe(false);
  });
});

describe("the pricing cross-field rule", () => {
  const plan = {
    name: "Starter",
    slug: "starter",
    tagline: "",
    is_custom_quote: false,
    price_from: 45000,
    currency: "INR",
    price_note: "",
    features: ["One page"],
    cta_label: "Start",
    cta_href: "/request-a-quote",
    is_highlighted: false,
    status: "published",
  };

  it("accepts a published plan with a price", () => {
    expect(pricingSchema().safeParse(plan).success).toBe(true);
  });

  it("accepts a published plan with no price when it is a custom quote", () => {
    const custom = { ...plan, price_from: undefined, is_custom_quote: true };

    expect(pricingSchema().safeParse(custom).success).toBe(true);
  });

  it("refuses a published plan with neither, against the price field", () => {
    /*
      The database has the same rule as a check constraint. Mirroring it here is
      what turns "new row violates check constraint pricing_plans_price_check"
      into a sentence beside the field that caused it.
    */
    const neither = { ...plan, price_from: undefined, is_custom_quote: false };
    const result = pricingSchema().safeParse(neither);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["price_from"]);
    expect(result.error?.issues[0].message).toContain("starting price");
  });

  it("lets a draft be saved with neither", () => {
    // A plan is written before its price is decided. The rule is about
    // publishing, not about storing.
    const draft = { ...plan, price_from: undefined, is_custom_quote: false, status: "draft" };

    expect(pricingSchema().safeParse(draft).success).toBe(true);
  });
});
