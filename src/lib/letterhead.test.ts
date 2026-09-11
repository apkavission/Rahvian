import { describe, expect, it } from "vitest";
import {
  addressFrom,
  contactLines,
  isLayoutKey,
  LAYOUTS,
  MARGIN,
  PAGE,
  statutoryGaps,
  statutoryLine,
  STATUTORY_FIELDS,
  type LetterheadCompany,
} from "@/lib/letterhead";

const full: LetterheadCompany = {
  companyName: "Rahvian",
  legalName: "Rahvian Technologies Private Limited",
  tagline: "Your Vision. We Make It Happen.",
  email: "hello@rahvian.com",
  phone: "+91 90000 00000",
  website: "rahvian.com",
  whatsapp: "+91 90000 00001",
  addressLines: ["12 Fraser Road", "Patna, Bihar 800001", "India"],
  workingHours: "Mon–Fri 10:00–19:00",
  cin: "U62099BR2026PTC000000",
  gst: "10AABCR1234A1Z5",
  socials: [{ label: "Linkedin", value: "linkedin.com/company/rahvian" }],
  logo: { light: null, dark: null },
};

describe("the page", () => {
  it("is A4 in millimetres, because the output is paper", () => {
    expect(PAGE).toEqual({ width: 210, height: 297 });
  });

  it("leaves the letter enough room to be a letter", () => {
    /* The writable height: A4 less the header reserve and the statutory foot.
       Under about 200mm a one-page letter starts spilling onto two. */
    const writable = PAGE.height - MARGIN.bodyTop - MARGIN.bottom;
    expect(writable).toBeGreaterThan(200);
  });

  it("keeps the side margins printable on an office printer", () => {
    /* Under 15mm and a desk printer clips; this also leaves room for a punch
       hole without eating into text. */
    expect(MARGIN.side).toBeGreaterThanOrEqual(15);
  });
});

describe("the layouts", () => {
  it("are each offered under a different key", () => {
    const keys = LAYOUTS.map((layout) => layout.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("each say what they are for, so the choice is not a guess", () => {
    for (const layout of LAYOUTS) {
      expect(layout.note.length, layout.key).toBeGreaterThan(40);
    }
  });

  it("recognises its own keys and nothing else", () => {
    expect(isLayoutKey("classic")).toBe(true);
    expect(isLayoutKey("fancy")).toBe(false);
    expect(isLayoutKey(undefined)).toBe(false);
  });
});

describe("what the law asks for", () => {
  it("names the six from section 12(3)(c) and no more", () => {
    expect(STATUTORY_FIELDS.map((field) => field.key)).toEqual([
      "legalName",
      "addressLines",
      "cin",
      "phone",
      "email",
      "website",
    ]);
  });

  it("does not ask for the GST number", () => {
    /*
      Deliberate. GSTIN belongs on a tax invoice and is merely conventional on
      a letterhead. A list that reports a non-requirement as a gap teaches
      somebody to ignore the list, which is how a real gap gets missed.
    */
    expect(STATUTORY_FIELDS.map((field) => field.key)).not.toContain("gst");
  });

  it("reports nothing when the row is filled in", () => {
    expect(statutoryGaps(full)).toEqual([]);
  });

  it("names the CIN when it is missing", () => {
    const gaps = statutoryGaps({ ...full, cin: "" });
    expect(gaps).toHaveLength(1);
    expect(gaps[0].key).toBe("cin");
  });

  it("treats a field of spaces as missing", () => {
    /* A space is what a text input contains after somebody clears it and
       leaves the cursor there. A letterhead printing a blank CIN is not
       compliant for having a column that is technically non-empty. */
    expect(statutoryGaps({ ...full, phone: "   " }).map((f) => f.key)).toEqual(["phone"]);
  });

  it("treats an address with no lines as missing", () => {
    expect(statutoryGaps({ ...full, addressLines: [] }).map((f) => f.key)).toEqual([
      "addressLines",
    ]);
  });
});

describe("the statutory line", () => {
  it("reads as one sentence across the foot", () => {
    expect(statutoryLine(full)).toBe(
      "Rahvian Technologies Private Limited · 12 Fraser Road, Patna, Bihar 800001, India · " +
        "CIN: U62099BR2026PTC000000 · GSTIN: 10AABCR1234A1Z5",
    );
  });

  it("leaves out what is not there rather than printing an empty label", () => {
    /* "CIN: · GSTIN:" with nothing after the colons is the generated-document
       tell this exists to avoid. */
    const line = statutoryLine({ ...full, cin: "", gst: "" });
    expect(line).not.toContain("CIN:");
    expect(line).not.toContain("GSTIN:");
    expect(line).toBe("Rahvian Technologies Private Limited · 12 Fraser Road, Patna, Bihar 800001, India");
  });
});

describe("contact lines", () => {
  it("are in the order they are read", () => {
    expect(contactLines(full)).toEqual(["+91 90000 00000", "hello@rahvian.com", "rahvian.com"]);
  });

  it("collapse rather than leaving a gap", () => {
    expect(contactLines({ ...full, email: "" })).toEqual(["+91 90000 00000", "rahvian.com"]);
  });
});

describe("the address", () => {
  it("joins the city, the state and the PIN the way an envelope reads", () => {
    expect(
      addressFrom({
        line1: "12 Fraser Road",
        city: "Patna",
        state: "Bihar",
        postalCode: "800001",
        country: "India",
      }),
    ).toEqual(["12 Fraser Road", "Patna, Bihar 800001", "India"]);
  });

  it("drops an empty second line instead of printing a hole", () => {
    /* `address_line2` is blank for most companies, and a naive join puts an
       empty line in the middle of the address — the commonest tell that a
       document was generated. */
    const lines = addressFrom({
      line1: "12 Fraser Road",
      line2: "",
      city: "Patna",
      state: "Bihar",
      postalCode: "800001",
      country: "India",
    });

    expect(lines).not.toContain("");
    expect(lines).toHaveLength(3);
  });

  it("survives a row with nothing in it", () => {
    expect(addressFrom({})).toEqual([]);
  });
});
