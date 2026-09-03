import { describe, expect, it } from "vitest";
import {
  BANNER_SIZES,
  bannerFileName,
  bannerSize,
  headlineSize,
  lines,
  longestLine,
  safeBox,
} from "./banner";

/**
 * The numbers behind a banner.
 *
 * The drawing is an `<svg>` the studio renders and the browser serialises. What
 * is tested here is what the drawing is *told*: the platform sizes, the part of
 * each that is never cropped, and the type size worked out from the space
 * available — which is the calculation that makes one set of words work on a
 * 600-pixel email header and a 2560-pixel channel banner.
 */

describe("the sizes offered", () => {
  it("are the ones the platforms actually ask for", () => {
    const found = new Map(BANNER_SIZES.map((size) => [size.key, `${size.width}x${size.height}`]));

    /* Every one of these is a number somebody would otherwise have to search
       for, and getting one wrong produces a blurry upload rather than an error. */
    expect(found.get("linkedin")).toBe("1584x396");
    expect(found.get("x")).toBe("1500x500");
    expect(found.get("facebook")).toBe("820x312");
    expect(found.get("youtube")).toBe("2560x1440");
    expect(found.get("instagram-story")).toBe("1080x1920");
    expect(found.get("email")).toBe("600x200");
  });

  it("say where each one goes", () => {
    for (const size of BANNER_SIZES) {
      expect(size.note.length).toBeGreaterThan(10);
    }
  });

  it("answer with something rather than nothing for an unknown key", () => {
    /* A stale bookmark naming a size that has been renamed should draw a banner,
       not a blank screen. */
    expect(bannerSize("no-such-size")).toBe(BANNER_SIZES[0]);
  });
});

describe("safeBox", () => {
  it("keeps the words out of what the platform crops", () => {
    const youtube = bannerSize("youtube");
    const box = safeBox(youtube);

    /*
      YouTube guarantees only the middle 1546×423 of a 2560×1440 image. A TV
      shows all of it and a phone shows a strip, which is why so many channel
      banners have half a word in them.
    */
    expect(box.width).toBeLessThan(1600);
    expect(box.height).toBeLessThan(500);
    expect(box.x).toBeGreaterThan(400);
  });

  it("leaves a margin even where nothing is cropped", () => {
    const square = bannerSize("instagram-post");
    const box = safeBox(square);

    /* Text touching the edge reads as a mistake wherever it is. */
    expect(box.x).toBeGreaterThan(0);
    expect(box.width).toBeLessThan(square.width);
  });

  it("never returns a box outside the banner", () => {
    for (const size of BANNER_SIZES) {
      const box = safeBox(size);

      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(size.width + 0.001);
      expect(box.y + box.height).toBeLessThanOrEqual(size.height + 0.001);
      expect(box.width).toBeGreaterThan(0);
      expect(box.height).toBeGreaterThan(0);
    }
  });
});

describe("headlineSize", () => {
  it("sets the same words larger on a bigger canvas", () => {
    const small = headlineSize(safeBox(bannerSize("email")), 20, 1);
    const large = headlineSize(safeBox(bannerSize("youtube")), 20, 1);

    expect(large).toBeGreaterThan(small);
  });

  it("sets a longer headline smaller in the same space", () => {
    const box = safeBox(bannerSize("linkedin"));

    expect(headlineSize(box, 60, 1)).toBeLessThan(headlineSize(box, 12, 1));
  });

  it("makes room for a second line rather than overflowing", () => {
    /*
      Two constraints, and the tighter one wins: the width the longest line has,
      and the height every line has to share.

      On a wide hero the width is the tighter of the two, so a second line
      changes nothing — 20 characters at that size already fit twice over
      vertically. That is correct, and asserting it got smaller was asserting
      the wrong rule. What must hold everywhere is that a second line never
      makes the type *bigger*.
    */
    const wide = safeBox(bannerSize("hero"));
    expect(headlineSize(wide, 20, 2)).toBeLessThanOrEqual(headlineSize(wide, 20, 1));

    /* Where the height is the tighter constraint — a short headline in a short
       strip — a second line does have to shrink it, or the two lines overlap. */
    const short = { width: 4000, height: 200 };
    expect(headlineSize(short, 8, 2)).toBeLessThan(headlineSize(short, 8, 1));
  });

  it("never returns something too small to read", () => {
    /* A pathological headline should come out small, not invisible. */
    expect(headlineSize({ width: 100, height: 40 }, 400, 6)).toBeGreaterThanOrEqual(12);
  });

  it("keeps a long headline inside the box it was given", () => {
    const box = safeBox(bannerSize("linkedin"));
    const text = "Everything your clinic needs, in one place";
    const size = headlineSize(box, text.length, 1);

    /* The estimate the studio draws with: 0.55 of the type size per character.
       If this ever exceeds the box, the last words are off the edge of a file
       somebody has already uploaded. */
    expect(size * 0.55 * text.length).toBeLessThanOrEqual(box.width + 0.001);
  });
});

describe("lines", () => {
  it("splits on the returns somebody typed", () => {
    expect(lines("Two lines\nlike this")).toEqual(["Two lines", "like this"]);
  });

  it("drops the blank ones rather than drawing a gap", () => {
    expect(lines("One\n\n\nTwo")).toEqual(["One", "Two"]);
    expect(lines("   ")).toEqual([]);
  });

  it("gives the longest line, which is what decides the size", () => {
    expect(longestLine(["short", "a much longer line"])).toBe(18);
    expect(longestLine([])).toBe(0);
  });
});

describe("bannerFileName", () => {
  it("names the file after the words and the size", () => {
    expect(bannerFileName("Open this week", "linkedin", 1584, 396, "png")).toBe(
      "open-this-week-linkedin@1584x396.png",
    );
  });

  it("never produces a name that is only punctuation", () => {
    expect(bannerFileName("!!!", "email", 600, 200, "png")).toBe("banner-email@600x200.png");
  });
});
