import { describe, expect, it } from "vitest";
import { bannerSize } from "./banner";
import {
  behind,
  contrastRatio,
  moved,
  resized,
  review,
  type ImageLayer,
  type Layer,
  type ShapeLayer,
  type TextLayer,
} from "./layers";

/**
 * The guidance, tested as guidance.
 *
 * ---------------------------------------------------------------------------
 * The point of these rules is that they catch what a person building a banner
 * cannot see: a word past the edge of a file they are viewing at a third scale,
 * grey text on a photograph that looks fine on their bright laptop, a logo
 * being stretched to three times its real size. Every one of those ships
 * looking correct.
 *
 * So what is tested is that each rule fires when it should and — as
 * importantly — stays quiet when it should not. A tool that warns about a
 * perfectly good banner is a tool people stop reading.
 */

const YOUTUBE = bannerSize("youtube");
const LINKEDIN = bannerSize("linkedin");

function text(over: Partial<TextLayer> = {}): TextLayer {
  return {
    id: "t1",
    kind: "text",
    /* Sized for a LinkedIn banner, which is what most of these use — 1584×396.
       A fixture that does not fit its own frame produces "off the edge" on
       every test and hides whatever each one was actually about. */
    x: 340,
    y: 120,
    width: 900,
    height: 150,
    z: 1,
    /* Short enough to fit the 900-unit box at 96 — the fixture must not itself
       trip the "wider than its box" rule, or every other test reads that note
       instead of the one it is about. */
    text: "Open six days",
    size: 96,
    weight: 700,
    colour: "#ffffff",
    font: "display",
    align: "left",
    lineHeight: 1.15,
    ...over,
  };
}

function image(over: Partial<ImageLayer> = {}): ImageLayer {
  return {
    id: "i1",
    kind: "image",
    x: 100,
    y: 60,
    width: 800,
    height: 280,
    z: 0,
    src: "data:image/png;base64,",
    naturalWidth: 1600,
    naturalHeight: 1200,
    fit: "contain",
    radius: 0,
    averageColour: "#101418",
    label: "shopfront.jpg",
    ...over,
  };
}

function shape(over: Partial<ShapeLayer> = {}): ShapeLayer {
  return {
    id: "s1",
    kind: "shape",
    x: 0,
    y: 0,
    width: 600,
    height: 400,
    z: 0,
    shape: "rect",
    fill: "#0f766e",
    radius: 12,
    opacity: 1,
    ...over,
  };
}

/** Every message in the review, for the assertions below. */
const said = (notes: ReturnType<typeof review>) => notes.map((note) => note.message).join(" | ");

describe("contrastRatio", () => {
  it("gives the extremes their known values", () => {
    /* Black on white is 21:1 — the top of the scale. Anything on itself is 1. */
    expect(Math.round(contrastRatio("#000000", "#ffffff"))).toBe(21);
    expect(contrastRatio("#3d5a80", "#3d5a80")).toBeCloseTo(1, 5);
  });

  it("is the same either way round", () => {
    expect(contrastRatio("#ffffff", "#0f766e")).toBeCloseTo(
      contrastRatio("#0f766e", "#ffffff"),
      6,
    );
  });
});

describe("what is behind a layer", () => {
  it("finds the image underneath it", () => {
    const under = image({ id: "photo", z: 0, x: 0, y: 0, width: 2560, height: 1440 });
    const over = text({ z: 5 });

    expect(behind(over, [under, over], "#ffffff")).toBe(under.averageColour);
  });

  it("ignores anything that does not overlap", () => {
    const elsewhere = image({ id: "photo", z: 0, x: 0, y: 0, width: 100, height: 100 });
    const over = text({ z: 5, x: 1500, y: 700 });

    expect(behind(over, [elsewhere, over], "#123456")).toBe("#123456");
  });

  it("ignores anything in front of it", () => {
    /* A layer above the text is not what the text is read against. */
    const above = image({ id: "photo", z: 9, x: 0, y: 0, width: 2560, height: 1440 });
    const under = text({ z: 5 });

    expect(behind(under, [above, under], "#ffffff")).toBe("#ffffff");
  });

  it("sees through a shape that is mostly transparent", () => {
    /* A 20%-opacity tint does not change what the eye separates letters from. */
    const faint = shape({ id: "tint", z: 0, opacity: 0.2, width: 2560, height: 1440, fill: "#000000" });
    const over = text({ z: 5 });

    expect(behind(over, [faint, over], "#ffffff")).toBe("#ffffff");
  });
});

describe("things off the edge", () => {
  it("says so when a layer runs past the frame", () => {
    const over = text({ x: 2400, width: 1600 });
    const notes = review([over], YOUTUBE, "#ffffff");

    expect(said(notes)).toContain("runs off the edge");
    expect(notes[0].level).toBe("problem");
  });

  it("says something different when it is gone entirely", () => {
    /* Different words, because the remedy is different: one is "move it in",
       the other is "you have probably lost it". */
    const notes = review([text({ x: 5000 })], YOUTUBE, "#ffffff");

    expect(said(notes)).toContain("completely outside");
  });

  it("warns about the part a platform crops, separately", () => {
    /*
      YouTube guarantees only the middle strip. A headline sitting inside the
      frame but outside that strip is invisible on a phone and perfect on a TV,
      which is exactly the mistake nobody catches.
    */
    const notes = review([text({ x: 100, y: 100, width: 600, height: 120 })], YOUTUBE, "#ffffff");

    expect(said(notes)).toContain("never cropped");
  });

  it("stays quiet about a layer comfortably inside", () => {
    const notes = review([text({ x: 700, y: 600, width: 1000, height: 150 })], YOUTUBE, "#000000");

    expect(said(notes)).not.toContain("edge");
    expect(said(notes)).not.toContain("cropped");
  });
});

describe("text nobody can read", () => {
  it("calls out text that disappears into its background", () => {
    const notes = review([text({ colour: "#dddddd" })], LINKEDIN, "#eeeeee");

    expect(said(notes)).toContain("not be readable");
    expect(notes.some((note) => note.level === "problem")).toBe(true);
  });

  it("separates 'hard to read' from 'impossible'", () => {
    /* A ratio between 3 and 4.5 passes for large type and fails for small. That
       is a warning, not a problem, and saying so is the difference between
       advice and noise. */
    /* #8a8a8a on white is about 3.4:1 — inside the band. #767676 is exactly
       4.5 and sits on the boundary, which is a poor thing to test against. */
    const notes = review([text({ colour: "#8a8a8a" })], LINKEDIN, "#ffffff");

    expect(said(notes)).toContain("hard to read");
    expect(notes.every((note) => note.level !== "problem")).toBe(true);
  });

  it("says nothing about white on a dark photograph", () => {
    const photo = image({ id: "p", z: 0, x: 0, y: 0, width: 1584, height: 396, averageColour: "#101418" });
    const over = text({ z: 5, x: 300, y: 120, width: 900, height: 150, colour: "#ffffff" });

    expect(said(review([photo, over], LINKEDIN, "#ffffff"))).not.toContain("read");
  });

  it("measures the size somebody will actually see it at", () => {
    /*
      A 2560-wide banner is shown about 1000 wide. Type that is 30 units tall in
      the file is about 12 pixels on screen — which reads as fine in the editor
      and as unreadable everywhere else.
    */
    const notes = review([text({ size: 30, x: 700, y: 600 })], YOUTUBE, "#000000");

    expect(said(notes)).toContain("pixels tall on screen");
  });

  it("notices a line too long for its own box", () => {
    const notes = review(
      [text({ text: "A headline far too long for the box it has been given", width: 300 })],
      LINKEDIN,
      "#000000",
    );

    expect(said(notes)).toContain("wider than the box");
  });

  it("mentions an empty piece of text", () => {
    expect(said(review([text({ text: "   " })], LINKEDIN, "#000000"))).toContain("empty");
  });
});

describe("images", () => {
  it("objects when an image is being blown up", () => {
    const small = image({ naturalWidth: 300, naturalHeight: 200, width: 1400, height: 280 });
    const notes = review([small], LINKEDIN, "#ffffff");

    expect(said(notes)).toContain("300 pixels wide");
    expect(notes.some((note) => note.level === "problem")).toBe(true);
  });

  it("is quieter about a slight stretch", () => {
    const notes = review(
      [image({ naturalWidth: 900, naturalHeight: 600, width: 1000, height: 280 })],
      LINKEDIN,
      "#ffffff",
    );

    expect(said(notes)).toContain("stretched slightly");
    expect(notes.filter((note) => note.level === "problem")).toHaveLength(0);
  });

  it("says nothing about an image large enough for its box", () => {
    const notes = review(
      [image({ naturalWidth: 2400, naturalHeight: 1600, width: 1200, height: 280, fit: "contain" })],
      LINKEDIN,
      "#ffffff",
    );

    expect(said(notes)).not.toContain("pixels wide");
    expect(said(notes)).not.toContain("stretched");
  });

  it("warns whenever an image is set to crop", () => {
    /*
      The standing rule in this estate is that an uploaded picture is never cut.
      `cover` is available because sometimes cropping is the point — and it is
      always said out loud, because most of the time it is not.
    */
    const notes = review([image({ fit: "cover" })], LINKEDIN, "#ffffff");

    expect(said(notes)).toContain("cut off");
  });

  it("says nothing about cropping when it fits the whole picture", () => {
    expect(said(review([image({ fit: "contain" })], LINKEDIN, "#ffffff"))).not.toContain("cut off");
  });
});

describe("the banner as a whole", () => {
  it("mentions a banner with no words on it", () => {
    expect(said(review([image()], LINKEDIN, "#ffffff"))).toContain("no words");
  });

  it("mentions too many separate pieces of text", () => {
    const many: Layer[] = [1, 2, 3, 4, 5].map((n) =>
      text({ id: `t${n}`, y: 40 * n, x: 340, width: 900, height: 40, size: 60 }),
    );

    expect(said(review(many, LINKEDIN, "#000000"))).toContain("separate pieces of text");
  });

  it("says when everything is outside the part that is seen", () => {
    const notes = review([text({ x: 30, y: 30, width: 200, height: 60 })], YOUTUBE, "#000000");

    expect(said(notes)).toContain("Nothing is inside");
  });

  it("puts the things that break the file first", () => {
    /*
      Somebody with three notes should fix the one that ruins the download
      before the one that is merely tight. Ordering is the difference between a
      list that gets worked through and one that gets skimmed.
    */
    const notes = review(
      [
        text({ x: 5000 }),
        image({ fit: "cover", id: "i2", naturalWidth: 2400, naturalHeight: 1600 }),
      ],
      LINKEDIN,
      "#ffffff",
    );

    const levels = notes.map((note) => note.level);

    expect(levels).toContain("problem");
    expect(levels).toContain("warning");
    expect(levels.indexOf("problem")).toBeLessThan(levels.indexOf("warning"));
  });

  it("gives every note something to do about it", () => {
    /* A warning with no remedy is a nag, and nags get ignored along with
       everything beside them. */
    const notes = review(
      [text({ x: 5000, colour: "#eeeeee" }), image({ fit: "cover", naturalWidth: 100 })],
      YOUTUBE,
      "#ffffff",
    );

    expect(notes.length).toBeGreaterThan(0);
    for (const note of notes) {
      expect(note.fix.length).toBeGreaterThan(15);
    }
  });

  it("is silent on a banner with nothing wrong with it", () => {
    const backdrop = shape({
      id: "bg",
      z: 0,
      x: 0,
      y: 0,
      width: LINKEDIN.width,
      height: LINKEDIN.height,
      fill: "#0f172a",
    });

    const headline = text({
      z: 2,
      x: 340,
      y: 120,
      width: 900,
      height: 150,
      size: 96,
      colour: "#ffffff",
      text: "Open six days",
    });

    const notes = review([backdrop, headline], LINKEDIN, "#ffffff");

    /* The only acceptable remaining note is a hint, and there should not even
       be one of those here. */
    expect(notes).toEqual([]);
  });
});

describe("moving and resizing", () => {
  it("never lets a layer be dragged out of reach", () => {
    /* A layer dragged wholly off the canvas cannot be grabbed to bring back. */
    const dragged = moved(text(), -5000, -5000, YOUTUBE);

    expect(dragged.x + dragged.width).toBeGreaterThan(0);
    expect(dragged.y + dragged.height).toBeGreaterThan(0);
  });

  it("lets a layer hang off the edge deliberately", () => {
    /* Half a shape off the side is a design decision, not a mistake — the
       review says it is cut, and that is the right way round. */
    const dragged = moved(shape(), -100, 40, YOUTUBE);
    expect(dragged.x).toBeLessThan(0);
  });

  it("never resizes a layer to nothing", () => {
    const shrunk = resized(text(), 0, -40);

    expect(shrunk.width).toBeGreaterThan(0);
    expect(shrunk.height).toBeGreaterThan(0);
  });
});
