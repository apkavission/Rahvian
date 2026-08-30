import { describe, expect, it } from "vitest";
import {
  aspectLabel,
  assessQuality,
  describeFit,
  IMAGE_FIELDS,
  ratioLabel,
  specLabel,
  type ImageFieldSpec,
  type MediaOption,
} from "@/lib/media/image-fields";

/**
 * The size check every image field applies.
 *
 * `docs/image-rules.md` sets out four outcomes and one rule about how to word
 * them. This is where both are held to: the outcome has to be right, and the
 * message has to name both numbers — "wrong size" is a warning nobody can act
 * on.
 */

const FIELD: ImageFieldSpec = {
  label: "Card image",
  width: 1600,
  height: 1000,
  use: "test",
};

function asset(over: Partial<MediaOption> = {}): MediaOption {
  return {
    id: "a",
    filename: "photo.jpg",
    url: "/media/a/photo.jpg",
    alt: "",
    width: 1600,
    height: 1000,
    vector: false,
    ...over,
  };
}

describe("describeFit", () => {
  it("accepts an exact match without comment", () => {
    const fit = describeFit(FIELD, asset());
    expect(fit.level).toBe("ok");
    expect(fit.message).toContain("1600 × 1000");
  });

  it("accepts a larger file of the same shape, and says it will be shown smaller", () => {
    const fit = describeFit(FIELD, asset({ width: 3200, height: 2000 }));
    expect(fit.level).toBe("note");
    // Both numbers: what was given, and what the field wants.
    expect(fit.message).toContain("3200 × 2000");
    expect(fit.message).toContain("1600 × 1000");
  });

  it("warns about a smaller file of the same shape, because it would be enlarged", () => {
    const fit = describeFit(FIELD, asset({ width: 800, height: 500 }));
    expect(fit.level).toBe("warn");
    expect(fit.message).toContain("800 × 500");
    expect(fit.message).toContain("1600 × 1000");
  });

  it("warns about a different shape, whatever its size", () => {
    const fit = describeFit(FIELD, asset({ width: 1600, height: 900 }));
    expect(fit.level).toBe("warn");
    expect(fit.message).toContain("1600 × 900");
    expect(fit.message).toContain("1600 × 1000");
  });

  it("promises empty space rather than a crop when the shape is wrong", () => {
    // The wording matters as much as the level: the rules say a mismatch
    // letterboxes, and a message that implied cropping would contradict what
    // the site actually does.
    const fit = describeFit(FIELD, asset({ width: 1000, height: 1000 }));
    expect(fit.message).toMatch(/whole|empty space/i);
    // It may say "nothing is cut off" — reassurance is fine. What it must never
    // do is describe a crop as the outcome.
    expect(fit.message).not.toMatch(/\bcrop/i);
    expect(fit.message).not.toMatch(/will be cut|gets cut/i);
  });

  it("treats a proportionally scaled size as the same shape", () => {
    // 1200 × 750 is 16:10 exactly. A ratio compared with two divisions and a
    // tolerance gets this wrong at the edges; a cross-product does not.
    const fit = describeFit(FIELD, asset({ width: 1200, height: 750 }));
    expect(fit.level).toBe("warn");
    expect(fit.message).toContain("right shape");
  });

  it("never blocks — every outcome is a level, not a refusal", () => {
    const sizes = [
      [1600, 1000],
      [3200, 2000],
      [10, 10],
      [1599, 1000],
    ] as const;

    for (const [width, height] of sizes) {
      const fit = describeFit(FIELD, asset({ width, height }));
      expect(["ok", "note", "warn"]).toContain(fit.level);
      expect(fit.message.length).toBeGreaterThan(0);
    }
  });

  describe("vectors", () => {
    it("accepts a vector at any declared size, because it scales without loss", () => {
      const fit = describeFit(FIELD, asset({ vector: true, width: 12, height: 4 }));
      expect(fit.level).toBe("ok");
    });

    it("says a vector is exactly right where one is preferred", () => {
      const logo: ImageFieldSpec = { ...FIELD, vectorPreferred: true };
      expect(describeFit(logo, asset({ vector: true })).message).toContain("exactly right");
    });
  });

  it("warns when the size could not be read at all", () => {
    const fit = describeFit(FIELD, asset({ width: null, height: null }));
    expect(fit.level).toBe("warn");
    expect(fit.message).toContain("1600 × 1000");
  });
});

describe("ratioLabel", () => {
  it.each([
    [1600, 1000, "8:5"],
    [1200, 630, "40:21"],
    [400, 400, "1:1"],
    [1920, 1080, "16:9"],
  ])("reduces %i × %i to %s", (width, height, expected) => {
    expect(ratioLabel(width, height)).toBe(expected);
  });

  it("gives a decimal where the reduced ratio would be unreadable", () => {
    // 1601:1000 reduces to itself and tells nobody anything.
    expect(ratioLabel(1601, 1000)).toBe("1.60:1");
  });
});

describe("the declared-size table", () => {
  const entries = Object.entries(IMAGE_FIELDS);

  it("has an entry for all twelve image fields on the site", () => {
    expect(entries).toHaveLength(12);
  });

  it("never lets a new field lower the bar every other one is judged against", () => {
    /*
      `SMALLEST_WIDTH` is `Math.min` over this table, and `assessQuality` calls
      anything narrower than it "too small". That derivation is deliberate — a
      field that wants a bigger picture should raise the bar automatically — but
      it cuts both ways, and the second direction is the dangerous one.

      Declaring one small field lowers the floor for **every** file on the media
      screen. It happened on 2026-08-28: a testimonial avatar was added at
      200 × 200 because that is the size it renders at, and a 200px upload
      stopped being called poor anywhere on the site. Nothing looked broken;
      one warning simply stopped appearing.

      So the floor is pinned here. If a field genuinely needs to be smaller than
      this, that is a decision to make on purpose — change this number and say
      why — rather than a side effect of adding a picture somewhere.
    */
    const smallest = Math.min(...entries.map(([, spec]) => spec.width));

    expect(smallest).toBe(400);
  });

  it.each(entries)("%s declares a real size and says where it is seen", (_key, spec) => {
    // The rules make a field with no declared size a bug in the field. This is
    // that rule, as an assertion.
    expect(spec.width).toBeGreaterThan(0);
    expect(spec.height).toBeGreaterThan(0);
    expect(spec.use.length).toBeGreaterThan(20);
    expect(spec.label.length).toBeGreaterThan(0);
  });

  it.each(entries)("%s prints a hint leading with its size", (_key, spec) => {
    const label = specLabel(spec);
    expect(label).toContain(`${spec.width} × ${spec.height}`);
    expect(label).toContain("px");
  });
});

describe("assessQuality", () => {
  const raster = (width: number, height: number, sizeBytes?: number) => ({
    width,
    height,
    vector: false,
    sizeBytes,
  });

  it("passes a file large enough for every field", () => {
    const quality = assessQuality(raster(1600, 1000));
    expect(quality.level).toBe("good");
  });

  it("refuses to call a tiny file acceptable", () => {
    // The owner's rule: a picture must never reach the site looking cheap.
    // 200px is below every declared field, so it can only ever sit in a space
    // several times its own size.
    const quality = assessQuality(raster(200, 125));
    expect(quality.level).toBe("poor");
    expect(quality.summary).toContain("200 × 125");
  });

  it("promises the small file will look small, not blurry", () => {
    // The site never enlarges — components/media/image.tsx caps every image at
    // its natural size — so the warning must not threaten blurriness it has
    // already prevented. Saying the wrong thing here teaches the owner to
    // distrust the warnings that matter.
    const quality = assessQuality(raster(200, 125));
    expect(quality.detail).toMatch(/never stretch|look small/i);
  });

  it("notes a file that suits the small fields but not the large ones", () => {
    const quality = assessQuality(raster(600, 400));
    expect(quality.level).toBe("note");
    expect(quality.detail).toContain("1600");
  });

  it("notes a wide file that is only a sliver tall", () => {
    const quality = assessQuality(raster(1800, 120));
    expect(quality.level).toBe("note");
  });

  it("notes a sharp file that is too heavy to load quickly", () => {
    const quality = assessQuality(raster(1600, 1000, 3 * 1024 * 1024));
    expect(quality.level).toBe("note");
    expect(quality.detail).toMatch(/WebP|quality/i);
  });

  it("never faults a vector, at any size", () => {
    expect(assessQuality({ width: 24, height: 24, vector: true }).level).toBe("good");
    expect(assessQuality({ width: null, height: null, vector: true }).level).toBe("good");
  });

  it("faults a raster whose size could not be read", () => {
    const quality = assessQuality({ width: null, height: null, vector: false });
    expect(quality.level).toBe("poor");
  });

  it("always gives both a summary and something to do about it", () => {
    const cases = [
      raster(1600, 1000),
      raster(200, 125),
      raster(600, 400),
      raster(1800, 120),
      { width: null, height: null, vector: false },
    ];

    for (const input of cases) {
      const quality = assessQuality(input);
      expect(quality.summary.length).toBeGreaterThan(0);
      expect(quality.detail.length).toBeGreaterThan(30);
    }
  });
});

describe("a shape-free field", () => {
  const gallery = IMAGE_FIELDS["project.gallery"];

  const asset = (width: number, height: number): MediaOption => ({
    id: "a",
    filename: "screen.png",
    url: "/media/screen.png",
    alt: "",
    width,
    height,
    vector: false,
  });

  it("says the shape does not matter rather than warning about it", () => {
    // A tall phone screen in a gallery is the feature, not a mistake. On a
    // framed field the same file is a warning, and that difference is the
    // whole point of the flag.
    const portrait = describeFit(gallery, asset(1400, 2800));

    expect(portrait.level).toBe("ok");
    expect(portrait.message).not.toContain("different shape");

    expect(describeFit(IMAGE_FIELDS["project.thumbnail"], asset(1400, 2800)).level).toBe(
      "warn",
    );
  });

  it("still warns when the file is narrower than the field draws at", () => {
    const narrow = describeFit(gallery, asset(600, 400));

    expect(narrow.level).toBe("warn");
    expect(narrow.message).toContain("600 × 400");
    expect(narrow.message).toContain(`${gallery.width}px`);
  });

  it("prints a hint that states the rule that actually applies", () => {
    const label = specLabel(gallery);

    expect(label).toContain(`${gallery.width} × ${gallery.height}`);
    expect(label).toContain("any shape");
    // The ratio is deliberately absent: printing "(8:5)" would state a
    // requirement that is not one.
    expect(label).not.toContain(":");
  });
});

describe("aspectLabel", () => {
  it("says the shape, using the same reduction as a field's own label", () => {
    // It delegates to `ratioLabel` since 2026-08-28. Before that it was a
    // second implementation with a different cap — 32 rather than 40 — so the
    // same file could be described two ways in two places of one admin.
    expect(aspectLabel(1200, 800)).toBe("3:2");
    expect(aspectLabel(1600, 1000)).toBe("8:5");
    expect(aspectLabel(400, 400)).toBe("1:1");
  });

  it("gives a decimal where the reduced ratio would be unreadable", () => {
    expect(aspectLabel(1201, 800)).toBe("1.50:1");
  });

  it("agrees with ratioLabel on every size it is given", () => {
    for (const [w, h] of [
      [1200, 630],
      [1600, 1000],
      [512, 512],
      [1201, 800],
      [1920, 1080],
    ]) {
      expect(aspectLabel(w, h)).toBe(ratioLabel(w, h));
    }
  });

  it("says what a vector's shape is, rather than a dash", () => {
    // An SVG has no pixel size, and "Scales to fit" is the true answer.
    expect(aspectLabel(null, null)).toBe("Scales to fit");
    expect(aspectLabel(512, null)).toBe("Scales to fit");
    expect(aspectLabel(0, 0)).toBe("Scales to fit");
  });
});
