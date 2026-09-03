import { describe, expect, it } from "vitest";
import {
  estimateWidth,
  fileName,
  initials,
  LAYOUTS,
  LOGO_SIZES,
  readableOn,
  soften,
  toRgb,
  wordmark,
} from "./logo";

/**
 * The arithmetic behind a logo.
 *
 * The drawing is a `<svg>` element the studio renders and the browser
 * serialises — there is nothing to unit-test in that, and a test asserting a
 * path string would only pin the shape to whatever it happens to be. What is
 * worth pinning is everything the shape is derived *from*, because those are
 * the decisions that go wrong quietly: two initials instead of three, a
 * viewBox that clips the last letter, white text on a colour it cannot be read
 * on.
 */

describe("initials", () => {
  it("takes one letter from one word", () => {
    expect(initials("dental")).toBe("D");
  });

  it("takes two from a name, and never three", () => {
    expect(initials("Smile Care")).toBe("SC");

    /*
      Three letters is where a monogram stops working, and the size that decides
      it is the favicon — 32 pixels, where a third letter is two pixels wide.
    */
    expect(initials("Smile Care Dental Studio")).toBe("SC");
  });

  it("skips the words nobody means", () => {
    /* "The Smile Care Clinic" is SC. A logo reading TS is the kind of small
       wrongness somebody notices and cannot explain. */
    expect(initials("The Smile Care Clinic")).toBe("SC");
    expect(initials("Kumar & Sons")).toBe("KS");
    expect(initials("Apka Saathi Private Limited")).toBe("AS");
  });

  it("falls back rather than returning nothing", () => {
    /* Everything was a skipped word. A blank mark reads as a broken tool, so
       what was typed is used as typed. */
    expect(initials("The Co")).toBe("TC");
  });

  it("survives punctuation and empty input", () => {
    expect(initials("  ")).toBe("");
    expect(initials("...")).toBe("");
    expect(initials("north-field school")).toBe("NS");
  });

  it("is not confused by a lowercase name", () => {
    expect(initials("apka vission")).toBe("AV");
  });
});

describe("wordmark", () => {
  it("collapses the spaces a person types", () => {
    /* A trailing space is invisible on screen and shifts a centred logo off
       centre in the downloaded file. */
    expect(wordmark("  Smile   Care  ")).toBe("Smile Care");
  });
});

describe("estimateWidth", () => {
  it("grows with the name", () => {
    expect(estimateWidth("Northfield Public School", "sans")).toBeGreaterThan(
      estimateWidth("Kora", "sans"),
    );
  });

  it("knows a narrow letter from a wide one", () => {
    /*
      Same letter count, very different width. Without this the viewBox for
      "Illini" is as wide as the one for "Mmmmmm", and one of the two logos sits
      badly off-centre.
    */
    expect(estimateWidth("mmmmmm", "sans")).toBeGreaterThan(estimateWidth("iiiiii", "sans"));
  });

  it("never comes out shorter than the text really is", () => {
    /*
      Measured in a browser with `getComputedTextLength`, at font-size 100, in
      the three stacks this studio offers. These are the numbers that matter:
      an estimate below any of them clips the name in the downloaded file, which
      is exactly what happened — "Smile Care Dental" was exported as "Smile Care
      Dent" because Georgia bold is sixteen per cent wider than the old model
      thought.

      Re-measure and update these if the type stack changes. They are evidence,
      not preference.
    */
    const MEASURED: Record<string, Record<string, number>> = {
      display: {
        "Smile Care Dental": 833,
        Kora: 219,
        "Meridian Institute of Commerce": 1502,
        "Northfield Public School": 1152,
        mmmmmm: 550,
        iiiiii: 171,
      },
      sans: {
        "Smile Care Dental": 857,
        Kora: 223,
        "Meridian Institute of Commerce": 1524,
        "Northfield Public School": 1170,
        mmmmmm: 540,
        iiiiii: 157,
      },
      serif: {
        "Smile Care Dental": 928,
        Kora: 257,
        "Meridian Institute of Commerce": 1658,
        "Northfield Public School": 1263,
        mmmmmm: 609,
        iiiiii: 212,
      },
    };

    for (const [font, samples] of Object.entries(MEASURED)) {
      for (const [text, real] of Object.entries(samples)) {
        const estimated = estimateWidth(text, font as "display" | "sans" | "serif");

        expect(estimated, `${font}: "${text}"`).toBeGreaterThanOrEqual(real);

        /* Generous, not absurd. A box twice the width of the name puts a logo
           in the corner of its own file. */
        expect(estimated, `${font}: "${text}" is far too wide`).toBeLessThan(real * 1.6);
      }
    }
  });

  it("answers zero for nothing", () => {
    expect(estimateWidth("", "sans")).toBe(0);
  });
});

describe("readableOn", () => {
  it("puts white on a dark colour and black on a light one", () => {
    expect(readableOn("#0f766e")).toBe("#ffffff");
    expect(readableOn("#fde68a")).toBe("#111111");
  });

  it("tells apart two colours that look equally dark", () => {
    /*
      This is the case the eye gets wrong. A mid green and a mid blue read as
      the same darkness; white text is comfortable on one and marginal on the
      other, and the formula is the only thing that knows.
    */
    expect(readableOn("#22c55e")).toBe("#111111");
    expect(readableOn("#2563eb")).toBe("#ffffff");
  });

  it("handles both hex lengths", () => {
    expect(readableOn("#000")).toBe("#ffffff");
    expect(readableOn("#fff")).toBe("#111111");
  });
});

describe("toRgb", () => {
  it("reads both hex lengths", () => {
    expect(toRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(toRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
    expect(toRgb("0f766e")).toEqual({ r: 15, g: 118, b: 110 });
  });

  it("answers grey for a colour half-typed", () => {
    /* Somebody typing "#0f7" into the picker passes through "#0", "#0f" — and
       the preview has to keep drawing rather than blanking on each keystroke. */
    expect(toRgb("#0f")).toEqual({ r: 128, g: 128, b: 128 });
    expect(toRgb("")).toEqual({ r: 128, g: 128, b: 128 });
  });
});

describe("soften", () => {
  it("moves a colour towards white without leaving it", () => {
    const soft = soften("#0f766e");

    expect(soft).toMatch(/^#[0-9a-f]{6}$/);
    expect(toRgb(soft).r).toBeGreaterThan(toRgb("#0f766e").r);
  });

  it("is white at full strength", () => {
    expect(soften("#0f766e", 1)).toBe("#ffffff");
  });
});

describe("fileName", () => {
  it("says what the file is, in a downloads folder six weeks later", () => {
    expect(fileName("Smile Care Dental", "header", 1200, 400, "png")).toBe(
      "smile-care-dental-header@1200x400.png",
    );
  });

  it("never produces a name that is only punctuation", () => {
    expect(fileName("...", "favicon", 32, 32, "svg")).toBe("logo-favicon@32x32.svg");
  });
});

describe("the offered choices", () => {
  it("offers five designs, because five were asked for", () => {
    expect(LAYOUTS).toHaveLength(5);
  });

  it("gives every design a reason to be chosen", () => {
    /* A row of five unlabelled thumbnails is a guess. Each says what it is for. */
    for (const layout of LAYOUTS) {
      expect(layout.note.length).toBeGreaterThan(20);
    }
  });

  it("covers the sizes somebody actually needs, including the small one", () => {
    const sizes = LOGO_SIZES.map((size) => `${size.width}x${size.height}`);

    /* The favicon is the size that decides whether a monogram works at all, and
       the one people forget until the site is live. */
    expect(sizes).toContain("32x32");
    expect(sizes).toContain("180x180");
    expect(sizes).toContain("512x512");
  });
});
