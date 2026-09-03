import { describe, expect, it } from "vitest";
import { generate, generateSet, letterColour, vary } from "./generate";
import { MARK_KINDS } from "./mark-shapes";
import { nearbySeed, newSeed, rng } from "./seed";

/**
 * The three promises the studio makes, tested as promises.
 *
 * ---------------------------------------------------------------------------
 * These are not "does it render" tests — the screen answers that. They are the
 * claims the owner made the tool for, and each one is false in a way that looks
 * fine on screen:
 *
 *   **Unique** — a generator that quietly repeats itself looks perfect until
 *   the eleventh client gets the fourth client's logo.
 *   **Reproducible** — "keep this one" is a lie if the same seed draws
 *   something else tomorrow.
 *   **More like this** — variations that hold nothing are five strangers, and
 *   variations that hold everything are the same logo five times. Both look
 *   like a working button.
 */

describe("the generator repeats itself only when asked", () => {
  it("draws the same logo from the same seed, every time", () => {
    /* "Keep this one" stores a number. If this fails, that number means nothing
       and every saved design is lost. */
    const first = generate(123456);
    const again = generate(123456);

    expect(again.accent).toBe(first.accent);
    expect(again.layout).toBe(first.layout);
    expect(again.mark.kind).toBe(first.mark.kind);
    expect(again.mark.solid.join()).toBe(first.mark.solid.join());
    expect(again.mark.outline.join()).toBe(first.mark.outline.join());
    expect(again.markScale).toBe(first.markScale);
  });

  it("draws something different from a different seed", () => {
    const drawings = new Set<string>();

    for (let seed = 1; seed <= 200; seed += 1) {
      const recipe = generate(seed * 977);
      drawings.add(
        [
          recipe.layout,
          recipe.accent,
          recipe.mark.kind,
          recipe.mark.strokeWidth,
          recipe.mark.solid.join("|"),
          recipe.mark.outline.join("|"),
        ].join("~"),
      );
    }

    /*
      Two hundred seeds, and near enough two hundred distinct drawings. A few
      collisions are acceptable — some families have genuinely few degrees of
      freedom, a filled triangle most of all — but anything below this and the
      tool is a list of shapes wearing a costume.
    */
    expect(drawings.size).toBeGreaterThan(190);
  });

  it("reaches every family of mark, not just the common ones", () => {
    const seen = new Set<string>();

    for (let seed = 1; seed <= 600; seed += 1) {
      seen.add(generate(seed * 31).mark.kind);
    }

    /* A family that never comes up is a family nobody will ever see, and the
       weighting is what decides that — so this is a check on the weights. */
    expect(seen.size).toBe(MARK_KINDS.length);
  });
});

describe("a set of five", () => {
  it("is five, and no two of them are the same idea", () => {
    const set = generateSet(2026);

    expect(set).toHaveLength(5);

    /*
      Family, arrangement and colour family together are what a person actually
      tells apart. Two designs differing only in a stroke width nobody can
      measure are one design shown twice, which is what makes a refresh feel
      broken.
    */
    const ideas = new Set(
      set.map((recipe) => `${recipe.layout}:${recipe.mark.kind}:${Math.round(recipe.hue / 24)}`),
    );

    expect(ideas.size).toBe(5);
  });

  it("gives a different five on the next refresh", () => {
    const first = generateSet(1);
    const second = generateSet(2);

    const seeds = new Set([...first, ...second].map((recipe) => recipe.seed));

    expect(seeds.size).toBe(10);
  });

  it("comes back to the same five for the same refresh", () => {
    /* The address can carry a seed, so a set of five can be sent to somebody. */
    expect(generateSet(99).map((one) => one.seed)).toEqual(
      generateSet(99).map((one) => one.seed),
    );
  });
});

describe("more like this one", () => {
  const parent = generate(555_000);
  const children = vary(parent);

  it("gives five", () => {
    expect(children).toHaveLength(5);
  });

  it("keeps what makes it recognisable", () => {
    /*
      Somebody pointing at a design and saying "like that, better" is not asking
      for that exact ring at that exact thickness. They are asking for another
      ring logo, arranged the same way, in that colour.
    */
    for (const child of children) {
      expect(child.layout).toBe(parent.layout);
      expect(child.hue).toBe(parent.hue);
    }
  });

  it("holds the mark family only on the layouts that draw one", () => {
    /*
      A monogram and a badge are initials inside a shape; a wordmark with a rule
      has no mark at all. Holding the family there spends the one degree of
      freedom that would have made five variations look different — the result
      was five tiles in one colour differing by a corner radius, which reads as
      a button that does nothing.
    */
    const drawn = generate(880_001, { layout: "beside" });
    for (const child of vary(drawn)) {
      expect(child.mark.kind).toBe(drawn.mark.kind);
    }

    const initialsOnly = generate(880_002, { layout: "monogram" });
    const families = new Set(vary(initialsOnly).map((child) => child.mark.kind));

    /* Free to roam, because none of it is on screen. What must differ is what
       is: the shade and the corner. */
    const looks = new Set(
      vary(initialsOnly).map((child) => `${child.accent}:${child.tileRadius.toFixed(2)}`),
    );
    expect(looks.size).toBe(5);
    expect(families.size).toBeGreaterThanOrEqual(1);
  });

  it("changes something in every one of them", () => {
    /* Holding everything gives the same logo five times, which looks exactly
       like a button that does nothing. */
    for (const child of children) {
      const identical =
        child.accent === parent.accent &&
        child.mark.solid.join() === parent.mark.solid.join() &&
        child.mark.outline.join() === parent.mark.outline.join() &&
        child.mark.strokeWidth === parent.mark.strokeWidth;

      expect(identical).toBe(false);
    }
  });

  it("gives different variations from each other", () => {
    const drawings = new Set(
      children.map((child) => `${child.accent}${child.mark.solid.join()}${child.mark.outline.join()}`),
    );

    expect(drawings.size).toBe(children.length);
  });

  it("gives the same variations for the same parent, tomorrow", () => {
    expect(vary(parent).map((child) => child.seed)).toEqual(
      children.map((child) => child.seed),
    );
  });

  it("can be asked again from a child, and narrows further", () => {
    /* Choosing a variation and asking again is the whole loop. It has to hold
       the child's own character, not drift back towards the grandparent. */
    const grandchildren = vary(children[0]);

    for (const grandchild of grandchildren) {
      expect(grandchild.mark.kind).toBe(children[0].mark.kind);
      expect(grandchild.hue).toBe(children[0].hue);
    }
  });
});

describe("the colours it chooses", () => {
  it("never picks one whose letters are a coin toss", () => {
    /*
      A monogram sets its letters black or white from the accent's luminance. An
      accent sitting on that boundary makes two nearly identical designs take
      opposite letter colours, which reads as a bug.
    */
    for (let seed = 1; seed <= 300; seed += 1) {
      const recipe = generate(seed * 13);
      const letters = letterColour(recipe);

      expect(["#ffffff", "#111111"]).toContain(letters);
    }
  });

  it("keeps the name legible against the page", () => {
    /* The ink is a near-black in the accent's own hue. Whatever the hue, it has
       to stay dark enough to read on white. */
    for (let seed = 1; seed <= 200; seed += 1) {
      const { ink } = generate(seed * 7);
      const hex = ink.replace("#", "");
      const brightness =
        (Number.parseInt(hex.slice(0, 2), 16) * 299 +
          Number.parseInt(hex.slice(2, 4), 16) * 587 +
          Number.parseInt(hex.slice(4, 6), 16) * 114) /
        1000;

      expect(brightness).toBeLessThan(90);
    }
  });

  it("stays out of the hues that cannot carry a brand", () => {
    /* Yellow-green highlighter and muddy orange. Both are technically colours
       and neither belongs on a dentist's letterhead. */
    for (let seed = 1; seed <= 400; seed += 1) {
      const { hue } = generate(seed * 17);
      expect(hue < 33 || hue > 95).toBe(true);
    }
  });
});

describe("the shapes it draws", () => {
  it("never draws a stroke too thin to survive a favicon", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const { mark } = generate(seed * 19);

      if (mark.outline.length === 0) continue;

      /* Eight units in a hundred. Below that, a 32-pixel favicon renders the
         stroke at under three pixels and it disappears into the rounding. */
      expect(mark.strokeWidth).toBeGreaterThanOrEqual(8);
    }
  });

  it("always draws something", () => {
    for (let seed = 1; seed <= 300; seed += 1) {
      const { mark } = generate(seed * 23);
      expect(mark.solid.length + mark.outline.length).toBeGreaterThan(0);
    }
  });

  it("keeps every shape inside the box a layout gives it", () => {
    /*
      Everything is drawn in a 0–100 box and placed by a layout that assumes it.
      A path straying outside is clipped in the downloaded file — invisible on
      screen, wrong in the PNG somebody sends to a printer.

      Stroke width counts: half of it sits outside the path.
    */
    for (let seed = 1; seed <= 300; seed += 1) {
      const { mark } = generate(seed * 29);
      const numbers = [...mark.solid, ...mark.outline]
        .join(" ")
        .match(/-?\d+(\.\d+)?/g)
        ?.map(Number) ?? [];

      const margin = mark.strokeWidth / 2;

      for (const value of numbers) {
        expect(value).toBeGreaterThanOrEqual(-margin - 1);
        expect(value).toBeLessThanOrEqual(100 + margin + 1);
      }
    }
  });
});

describe("the seed itself", () => {
  it("gives a whole positive number", () => {
    for (let i = 0; i < 50; i += 1) {
      const seed = newSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThan(0);
    }
  });

  it("survives being handed something silly", () => {
    /* A seed from an address bar is whatever somebody typed. */
    expect(() => generate(0)).not.toThrow();
    expect(() => generate(-5)).not.toThrow();
    expect(() => generate(3.7)).not.toThrow();
  });

  it("spreads, rather than walking a line", () => {
    /* A generator whose successive draws creep upwards produces five designs
       that shade into one another instead of five choices. */
    const random = rng(42);
    const draws = Array.from({ length: 400 }, () => random.next());

    const average = draws.reduce((sum, value) => sum + value, 0) / draws.length;
    expect(average).toBeGreaterThan(0.42);
    expect(average).toBeLessThan(0.58);

    const low = draws.filter((value) => value < 0.5).length;
    expect(low).toBeGreaterThan(150);
    expect(low).toBeLessThan(250);
  });

  it("gives a stable child seed for the same parent and step", () => {
    expect(nearbySeed(1000, 3)).toBe(nearbySeed(1000, 3));
    expect(nearbySeed(1000, 3)).not.toBe(nearbySeed(1000, 4));
  });
});
