import { describe, expect, it } from "vitest";
import {
  applyTitleTemplate,
  parseOrganizationSchema,
  seoSchema,
} from "@/lib/validation/seo";

/**
 * The SEO defaults.
 *
 * Three of these rules protect against a failure that is silent by nature: a
 * title template with no placeholder is ignored rather than refused, a pasted
 * `<meta>` tag verifies nothing and says nothing, and an Organization override
 * that is an array spreads into numeric keys and validates as no company at
 * all. None of the three looks wrong on the screen that caused it.
 */

const valid = {
  title_template: "%s | Rahvian Technologies Private Limited",
  default_title: "Rahvian Technologies Private Limited",
  default_description: "We build websites, apps and custom software.",
  google_verification: "",
  bing_verification: "",
  organization_schema: "",
};

describe("applyTitleTemplate", () => {
  it("puts the page title where the placeholder is", () => {
    expect(applyTitleTemplate("%s | Rahvian", "Pricing")).toBe(
      "Pricing | Rahvian",
    );
  });

  it("returns the title unchanged when the template has no placeholder", () => {
    // The form refuses to save such a template. This is the behaviour for a row
    // written before that rule existed — the title survives, the suffix is lost.
    expect(applyTitleTemplate("Rahvian", "Pricing")).toBe("Pricing");
  });

  it("returns the title unchanged when there is no template at all", () => {
    expect(applyTitleTemplate(null, "Pricing")).toBe("Pricing");
    expect(applyTitleTemplate(undefined, "Pricing")).toBe("Pricing");
  });

  it("replaces only the first placeholder", () => {
    expect(applyTitleTemplate("%s — %s", "Pricing")).toBe("Pricing — %s");
  });
});

describe("seoSchema", () => {
  it("accepts a complete row", () => {
    expect(seoSchema.safeParse(valid).success).toBe(true);
  });

  it("refuses a title template with no placeholder", () => {
    const result = seoSchema.safeParse({ ...valid, title_template: "Rahvian" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("%s");
  });

  it("refuses a pasted meta tag as a verification code", () => {
    const result = seoSchema.safeParse({
      ...valid,
      google_verification: '<meta name="google-site-verification" content="abc" />',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toContain("<meta>");
  });

  it("accepts the token on its own", () => {
    const result = seoSchema.safeParse({
      ...valid,
      google_verification: "A1b2C3-d4E5f6_g7H8",
    });

    expect(result.success).toBe(true);
    expect(result.data?.google_verification).toBe("A1b2C3-d4E5f6_g7H8");
  });

  it("stores a cleared verification code as absent, not as a blank", () => {
    expect(seoSchema.safeParse(valid).data?.google_verification).toBeNull();
  });

  it("reads the crawl switch from whether the field was posted at all", () => {
    expect(seoSchema.safeParse(valid).data?.site_noindex).toBe(false);
    expect(
      seoSchema.safeParse({ ...valid, site_noindex: "on" }).data?.site_noindex,
    ).toBe(true);
  });

  it("requires the fallback title and description", () => {
    expect(seoSchema.safeParse({ ...valid, default_title: "  " }).success).toBe(false);
    expect(seoSchema.safeParse({ ...valid, default_description: "" }).success).toBe(
      false,
    );
  });
});

describe("parseOrganizationSchema", () => {
  it("treats empty as no override", () => {
    expect(parseOrganizationSchema("   ")).toEqual({ ok: true, value: {} });
  });

  it("accepts an object", () => {
    const result = parseOrganizationSchema('{"name":"Rahvian"}');

    expect(result).toEqual({ ok: true, value: { name: "Rahvian" } });
  });

  it("refuses an array", () => {
    // Spreading one into the Organization node produces numeric keys: a graph
    // that parses, describes nothing, and looks fine in the form.
    const result = parseOrganizationSchema('[{"name":"Rahvian"}]');

    expect(result.ok).toBe(false);
  });

  it("refuses a bare value", () => {
    expect(parseOrganizationSchema('"Rahvian"').ok).toBe(false);
    expect(parseOrganizationSchema("null").ok).toBe(false);
    expect(parseOrganizationSchema("42").ok).toBe(false);
  });

  it("names the likely cause when the JSON does not parse", () => {
    const result = parseOrganizationSchema('{"name":"Rahvian",}');

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.message).toContain("trailing comma");
  });
});
